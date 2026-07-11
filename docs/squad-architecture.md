# Squad Architecture

## Problem

Squads were an implicit concept — units shared a `squadId` integer on `SquadMember`, but no squad entity existed. Every system that needed squad-level behavior reconstructed the grouping from scratch via GROUP BY. Both `TargetAcquisitionSystem` and `CommandSystem` did this independently, and any future squad-level system would repeat the same pattern.

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

- `Squad` — mode (march/ranged/melee), formation type
- `Transform3D` — squad center position (averaged from members by `SquadCenterSystem`)
- `Networked` — owner/team
- `Path` — the squad's path (single path for whole squad, added by commands)
- `SquadTarget` — which enemy squad to engage (added by target acquisition)

### Unit Entity Components

- `SquadMember { squadId }` — references the squad **entity ID**
- `Transform3D` — individual position
- `FormationOffset` — offset from squad center
- `BoundingBox` — collision

### Cross-Entity Communication: `query.get()`

The key pattern for unit→squad communication is `query.get()`. It compiles to O(1) direct array lookups — the same SoA-friendly access as `query.iter()`. Unit systems call `squadQuery.get(member.squadId, ...)` inline to read squad-level data. No bridge components, no data duplication.

```typescript
// Unit steering reads squad position directly
export default function MovementSystem(
  unitQuery: Query<[Transform3D, SquadMember, FormationOffset]>,
  squadQuery: Query<[Squad, Transform3D]>,
) {
  unitQuery.iter(([_entity, transform, member, offset]) => {
    squadQuery.get(member.squadId, ([_squadEntity, _squad, squadTransform]) => {
      // steer toward squadTransform + offset
    });
  });
}
```

Adding squad-level state = add a component to the squad entity. Unit systems that need it call `query.get()`. No scatter system, no bridge component to keep in sync.

### Squad Member Iteration

Systems that need to iterate all members of a squad (e.g. `SquadCenterSystem` for averaging positions) rebuild a `Map<squadId, data>` per frame. With ~50 squads this is cheap. Only one system currently needs this pattern.

Long-term, secondary indexes in the ECS core (`Map<fieldValue, entityId[]>` maintained on component add/remove) would eliminate even this rebuild. Deferred until more systems need grouped iteration.

## System Architecture

```
Input/Commands
  → write to squad entities (Path, SquadTarget)

Squad-level systems (few entities, cheap)
  → SquadCenterSystem: average member positions → squad Transform3D
  → PathfindingSystem: advance squad along waypoints
  → TargetAcquisitionSystem: squad vs squad, writes SquadTarget

Unit-level systems (many entities, SoA-friendly)
  → MovementSystem: steer toward squad position + formation offset via query.get()
  → ColliderSystem: per-unit AABB
```

## Pathfinding

Pathfinding runs once at the squad level. The squad entity gets one `Path`. Units don't pathfind — they steer toward their formation position relative to the squad's current position.

- `PathfindingSystem`: runs on squad entities. ~50 pathfinds instead of ~300.
- `MovementSystem`: each unit reads squad position via `query.get()`, adds its formation offset, steers toward that point.

Units can't separate because they all follow the same squad position. Local obstacle avoidance and separation forces handle collisions.

## Mode Switching

The squad's mode determines how much autonomy units get:

**Marching:** Units follow squad position + formation offsets. Tight formation, minimal individual behavior.

**Ranged combat:** Units hold formation. Squad picks target. All units shoot toward target squad's center.

**Melee:** Units break formation. Each unit picks the nearest enemy and moves to it individually. Per-unit steering and collision matter most here.

## Collision Detection

Squad-level broad phase checks ~50 squad bounding volumes instead of ~300 unit AABBs. Per-unit collision is still needed for melee interactions and could use squad bounding volumes as a hierarchical broad phase.