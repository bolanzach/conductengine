# Squad Architecture Design

## Problem

Squads are currently an implicit concept — units share a `squadId` integer on `SquadMember`, but no squad entity exists. Every system that needs squad-level behavior reconstructs the grouping from scratch:

1. Iterate all units → group by `squadId` into a Map
2. Aggregate member state (center position, idle status, etc.)
3. Make a squad-level decision (pick target, choose destination)
4. Fan the decision back out to individual members

Both `TargetAcquisitionSystem` and `CommandSystem` do this independently. Any future squad-level system (morale, abilities, squad AI) would repeat the same pattern. Nested queries don't help because the bottleneck is a GROUP BY operation, not iteration order.

## Design: Squad Brain, Unit Body

Both squads and units are entities. The squad decides, units execute.

**Squad entity decides:**
- Where to move (destination, path)
- Who to fight (target squad)
- What mode (marching, ranged combat, melee)
- Formation type

**Unit entity executes:**
- Its own position (steering toward formation position)
- Local obstacle avoidance
- Its own collision
- In melee: which specific enemy to attack

### Squad Entity Components

- `Squad` — metadata (formation type, mode: march/ranged/melee)
- `Transform3D` — squad center position
- `Networked` — owner/team
- `SquadMembers` — array of member entity IDs (non-SoA, acceptable for few squad entities)
- `Path` — the squad's path (single path for whole squad)
- `SquadTarget` — which enemy squad to engage
- `MoveTarget` — movement destination

### Unit Entity Components (unchanged)

- `SquadMember { squadId }` — now references squad entity ID
- `Transform3D` — individual position
- `FormationOffset` — offset from squad center
- `BoundingBox` — collision
- `UnitDirective` — current orders from squad (written by scatter system, read by unit systems)
- `AttackTarget` — which specific enemy unit to attack (relevant in melee)

## System Architecture

### Three tiers

```
Input/Commands
  → write to squad entities (MoveTarget, SquadTarget, SquadMode)

Squad-level systems (few entities, cheap)
  → SquadPathfindingSystem: A* on squad entities
  → SquadTargetAcquisitionSystem: nested query, squad vs squad
  → SquadModeSystem: decide march/ranged/melee based on range to target

Scatter (once per frame, tiny map)
  → read squad query (~50 entries), build lookup
  → iterate all units, write squad state into UnitDirective component

Unit-level systems (many entities, SoA-friendly)
  → UnitSteeringSystem: steer toward formation point or individual target
  → UnitCollisionSystem: per-unit AABB
  → UnitAnimationSystem: per-unit visual state
```

### The scatter bridge

The scatter system bridges squad decisions to unit execution. It runs once per frame:

1. Iterate squad entities, build a small Map (~50 entries) of squad state
2. Iterate all units (SoA-friendly), look up squad state via `member.squadId`, write to `UnitDirective`

Unit-level systems only read `UnitDirective` — no `ConductGetComponent`, no per-unit entity lookups. Unit iteration stays fully SoA-friendly.

## Pathfinding Fix

**Current problem:** Each unit runs A* independently with slightly different destinations (formation offsets). Units take different routes and separate.

**Solution:** Pathfind once at the squad level. The squad entity gets one `Path`. Units don't pathfind — they steer toward their formation position along the squad's path.

- `SquadPathfindingSystem`: runs on squad entities. ~50 pathfinds instead of ~300.
- `UnitSteeringSystem`: each unit computes target point (squad path position + formation offset), steers toward it with local obstacle avoidance and separation forces.

Units can't separate because they follow the same path. Obstacles are handled with local steering, not full A* re-routing. A cohesion force pulls strays back toward their formation slot.

## Mode Switching

The squad's mode determines how much autonomy units get:

**Marching:** Units follow squad path + formation offsets. Tight formation, minimal individual behavior.

**Ranged combat:** Units hold formation. Squad picks target. All units shoot toward target squad's center. Individual aiming variation is cosmetic.

**Melee:** Units break formation. Each unit picks the nearest enemy from the target squad and moves to it individually. Per-unit steering and collision matter most here.

**Transitions:** Squad approaches enemy → enters engagement range → ranged mode. Enemy closes distance → melee mode, units swarm. Enemy squad dies → back to marching, units reform formation.

## Collision Detection

### Current approach (validated)

The external service pattern (CollisionService + GridSpatialIndex) is architecturally sound. Spatial indexes are acceleration structures, not gameplay concepts — every production ECS engine uses external services for spatial queries.

### With squad entities

Squad-level broad phase checks ~50 squad bounding volumes instead of ~300 unit AABBs. At that scale, brute force N² (1,225 checks) may be sufficient without a spatial index. Per-unit collision is still needed for melee interactions and could use squad bounding volumes as a hierarchical broad phase.

### Current implementation notes

- `detect()` method in `collisionService.ts` does brute-force O(n) ignoring the spatial index — should use the index if used in hot paths
- `unregister()` is never called — stale entities remain in the index after despawn (latent bug)
- `detectAll()` and `broadPhase()` allocate new arrays every frame — pre-allocated reusable buffers would reduce GC pressure
- `Float64Array` could be `Float32Array` (game positions don't need double precision)

## ECS Core Consideration: Secondary Indexes

For the longer term, the grouping problem (iterate entities by a field value) recurs across many features: squads, teams, tile types, buff groups.

**Shared components (Unity DOTS style) were considered but rejected** — they cause archetype explosion. 50 squads = 50 archetypes with 6 entities each. Every broad query (movement, rendering) iterates 50 tiny chunks instead of one chunk of 300. SoA iteration loses its advantage with chunks that small.

**Secondary indexes** are a better fit:
- Optional `Map<value, entityId[]>` maintained by the ECS on component add/remove
- No archetype fragmentation, broad query performance unchanged
- Exposes a grouped iteration API: `query.iterGrouped(field, callback)`
- Minimal core change, opt-in per field

This would make the scatter pattern even cheaper (no Map rebuild — the index IS the Map) and could eliminate the need for `SquadMembers` arrays on squad entities.