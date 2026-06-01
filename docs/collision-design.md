# Collision System Design

## Overview

Entity-vs-entity collision detection and response for the Conduct Engine. Uses AABB (axis-aligned bounding box) collisions. Complex shapes can compose multiple bounding boxes across child entities to cover their shape.

Key design decisions:
- Collision detection lives **outside** the ECS as a standalone service. The ECS provides efficient entity iteration; the collision service provides efficient spatial queries. A system bridges the two.
- The broad phase uses a **uniform grid spatial hash** for spatial partitioning. The collision service accepts a pluggable `SpatialIndex` interface — the game supplies the implementation (e.g., `GridSpatialIndex` for the RTS, backed by the tile grid's coordinate system).
- Events use the standalone `@conduct/events` API (`ConductEventEmit` / `ConductEventConsume`), not injected into Query parameters.

Scope: entity-vs-entity AABB only. Tile/terrain collision (walkability, structure blocking) is a pathfinding concern handled separately.

## Components

```typescript
// AABB defined as half-extents, centered on Transform position
export class BoundingBox {
  hx = 0.5; // half-extent x
  hy = 0.5; // half-extent y
  hz = 0.5; // half-extent z
}

// Optional: collision layer filtering to avoid unnecessary checks
// (e.g., bullets don't check against other bullets)
export class CollisionLayer {
  mask = 0xffffffff; // what I collide with
  group = 1; // what group I belong to
}
```

## Collision Event

```typescript
@ConductEventRegister
class CollisionEvent extends ConductEvent {
  a = 0; // entity ID
  b = 0; // entity ID
}
```

Consumers subscribe once at setup time:

```typescript
ConductEventConsume(CollisionEvent, (event) => {
  // handle collision between event.a and event.b
});
```

## SpatialIndex Interface

Abstracts the spatial querying strategy so the collision service is decoupled from any particular spatial data structure. The game supplies the implementation.

```typescript
interface SpatialIndex {
  /** Insert or update an entity's position and half-extents (2D, top-down). */
  update(entity: number, x: number, z: number, hx: number, hz: number): void;

  /** Remove an entity from the index. */
  unregister(entity: number): void;

  /** Return candidate collision pairs from the broad phase. */
  broadPhase(): [number, number][];
}
```

2D (x, z) because this is a top-down RTS — Y is ignored for spatial bucketing. The collision service handles the full 3D AABB narrow phase separately.

### Why an interface?

The spatial partitioning strategy is game-specific. An RTS with uniformly-sized units on a tile grid benefits from a uniform grid hash. A game with wildly varying entity sizes might prefer a quadtree. The `SpatialIndex` interface lets the collision service work with either without code changes. This also means the collision service, components, and interface could eventually move to `@conduct/simulation`, with the game-specific spatial index staying in the game package.

## GridSpatialIndex

The RTS implementation of `SpatialIndex`. Uses a uniform grid hash aligned with the tile grid's coordinate system.

- **Cell size** = TILE_SIZE (1 unit). This is a separate data structure from the tile `Grid` class — the collision index doesn't modify or depend on tile data.
- **Position-to-cell**: `cellX = Math.floor(x)`, `cellZ = Math.floor(z)`.
- **Cell key**: pack `(cellX, cellZ)` into a single integer via bit shift.
- **Storage**: `Map<number, number[]>` mapping packed cell key to arrays of entity IDs.
- **`update()`**: compute cell key from position. If the entity moved to a different cell, remove from old bucket, insert into new. If same cell, no-op (position data for narrow phase lives in the CollisionService, not here).
- **`broadPhase()`**: iterate occupied cells. For each cell, emit all intra-cell pairs. Then check 4 neighbor cells with higher keys (right, below, below-right, below-left) to catch cross-boundary overlaps without duplicate pair emission.
- **Large entities** (buildings spanning multiple tiles): insert into all cells they overlap.

### Why uniform grid hash over quadtree?

- Entities in this RTS are similarly sized (SpaceMarine ~0.5 units). Uniform grids are optimal when entity sizes are homogeneous.
- TILE_SIZE = 1 is a natural cell size — no coordinate conversion needed.
- Simpler to implement and faster in practice: no tree rebalancing, no node splitting.
- O(n) for uniformly distributed entities. Worst case (all entities in one cell) degrades to O(n²), but that's unlikely in an RTS.

## Collision Service

A standalone class (not ECS-managed) that handles spatial queries. Fully decoupled from ECS internals — receives data through explicit `update` calls, does not reach into archetype columns directly.

### API

```typescript
const service = new CollisionService(spatialIndex);

// Update entity position + bounds (called per entity each frame)
service.update(entity, x, y, z, hx, hy, hz);

// Remove entity from spatial state
service.unregister(entity);

// Detect all colliding pairs from current state
service.detectAll(); // -> [number, number][]

// On-demand per-entity query (for proximity checks, etc.)
service.detect(entity); // -> number[]
```

### Internal implementation

- Stores per-entity AABB data (x, y, z, hx, hy, hz) in parallel arrays keyed by entity ID.
- `update()` writes AABB data and calls `spatialIndex.update(entity, x, z, hx, hz)`.
- `detectAll()` calls `spatialIndex.broadPhase()` for candidate pairs, then filters with the full 3D AABB overlap test: `|ax - bx| < ahx + bhx && |ay - by| < ahy + bhy && |az - bz| < ahz + bhz`.
- Layer mask filtering (if `CollisionLayer` data is provided): skip pair if `(a.group & b.mask) === 0 && (b.group & a.mask) === 0`.

## ColliderSystem

Single iteration updates the service, then `detectAll()` runs the broad phase and emits events.

```typescript
export default function ColliderSystem(
  query: Query<[Transform3D, BoundingBox]>
): void {
  // Feed current positions into the collision service
  query.iter(([entity, t, b]) => {
    collisionService.update(entity, t.x, t.y, t.z, b.hx, b.hy, b.hz);
  });

  // Broad phase + narrow phase
  const pairs = collisionService.detectAll();

  for (let i = 0; i < pairs.length; i++) {
    const event = new CollisionEvent();
    event.a = pairs[i]![0]!;
    event.b = pairs[i]![1]!;
    ConductEventEmit(event);
  }
}
```

### Why two steps?

The update and detect phases cannot be combined into a single iteration. Entity 5's collision check needs entity 12's position to already be current, but entity 12 may not have been visited yet. Update-all-then-detect-all is the correct ordering.

The update pass is a linear iteration over SoA columns (exactly what the compiler optimizes for — just copying floats). The actual expensive work is inside `detectAll()`, and that cost is identical regardless of how data is fed in.

### Stale entity cleanup

Entities that had `BoundingBox` removed or were deleted need to be unregistered from the service. Hook into `ConductRemoveComponent` / `ConductDeleteEntity` to call `collisionService.unregister(entity)`.

## Events

Collision events use the general-purpose `@conduct/events` infrastructure. The API is callback-based with immediate dispatch.

```typescript
// Define and register an event type
@ConductEventRegister
class CollisionEvent extends ConductEvent {
  a = 0;
  b = 0;
}

// Emit from ColliderSystem (fires callbacks synchronously)
const event = new CollisionEvent();
event.a = entityA;
event.b = entityB;
ConductEventEmit(event);

// Subscribe once at setup time
ConductEventConsume(CollisionEvent, (event) => {
  // handle collision between event.a and event.b
});
```

### Implementation notes

- `ConductEventConsume` subscribes a callback and returns an unsubscribe function for cleanup.
- `ConductEventEmit` dispatches synchronously — callbacks fire immediately during the emitting system's execution.
- System ordering still matters: the ColliderSystem must run before any system that needs collision results to be available. Since callbacks fire synchronously during emit, consuming systems don't need to "read events" in their main body — the callback handles it.
- No compiler changes required. No Query integration. Just function calls.

### Why not Bevy-style injection?

The only argument for injecting events into Query parameters is scheduler dependency analysis for automatic parallelism — the scheduler can see which systems read/write which events and parallelize safely. Conduct systems run sequentially in registration order, so that doesn't apply. A simple function call is simpler, more flexible (usable outside systems), and requires no compiler changes.

## Frame Flow

```
1. CommandSystem          — processes player commands
2. MovementSystem         — moves entities based on MoveTarget
3. ColliderSystem         — feeds service, detectAll(), emits CollisionEvents
4. (collision callbacks)  — fire synchronously during step 3 (damage, knockback, etc.)
5. NetworkSnapshotSystem  — captures state for replication
6. NetworkSendSystem      — sends snapshots to clients
7. (tick end)             — flush deferred commands
```

ColliderSystem must run after all movement systems (positions are final) and before network snapshot (collision responses are captured). Collision event callbacks fire synchronously during step 3, so consumers don't need their own system — they can register a callback at setup time.

## Implementation Order

1. ~~Events system~~ (done — `@conduct/events`)
2. Collision components (`BoundingBox`, optionally `CollisionLayer`)
3. Collision event (`CollisionEvent` class with `@ConductEventRegister`)
4. `SpatialIndex` interface + `GridSpatialIndex` implementation
5. `CollisionService` (accepts `SpatialIndex`, does AABB narrow phase)
6. `ColliderSystem` (bridges ECS iteration with collision service, emits events)
7. Add `BoundingBox` to entity bundles (e.g., `SpaceMarineBundle`)
8. Consumer callback for collision response (damage, etc.)