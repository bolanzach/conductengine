# Collision System Design

## Overview

Collision detection and response for the Conduct Engine. Uses AABB (axis-aligned bounding box) collisions. Complex shapes can compose multiple bounding boxes across child entities to cover their shape.

Key design decision: collision detection lives **outside** the ECS as a standalone service. The ECS provides efficient entity iteration; the collision service provides efficient spatial queries. A system bridges the two. Events are also a standalone API (`ConductEmitEvent` / `ConductGetEvents`), not injected into Query parameters.

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

## Collision Service

A standalone class/module (not ECS-managed) that handles spatial queries. Fully decoupled from ECS internals — receives data through explicit `update` calls, does not reach into archetype columns directly.

### API

```typescript
// Update entity position + bounds (called per entity each frame)
CollisionService.update(entityId, x, y, z, hx, hy, hz);

// Remove entity from spatial state (called on component removal / entity deletion)
CollisionService.unregister(entityId);

// Detect all colliding pairs from current state
CollisionService.detectAll(); // -> [entityA, entityB][]

// On-demand per-entity query (for raycasts, proximity checks, etc.)
CollisionService.detect(entityId); // -> entityId[]
```

### Internal implementation

- Starts as O(n^2) brute-force AABB overlap checks.
- Can be optimized later with spatial partitioning (quadtree for 2D, octree for 3D) without changing the external API.
- Layer mask filtering, static-vs-dynamic checks, and other optimizations are owned by the service internally.

## ColliderSystem

Single iteration updates the service, then `detectAll()` runs the broad phase and emits events.

```typescript
export function CollisionSystem(query: Query<[Transform3D, Collider]>): void {
  // Single pass: feed current positions into the collision service
  query.iter(([entity, transform, collider]) => {
    collisionService.update(entity, transform, collider);
  });

  // Detect all pairs (N^2 or spatial index, handled internally)
  const pairs = collisionService.detectAll();

  for (const [a, b] of pairs) {
    ConductEmitEvent(ConductCollisionEvent, { a, b });
  }
}
```

### Why two steps?

The update and detect phases cannot be combined into a single iteration. Entity 5's collision check needs entity 12's position to already be current, but entity 12 may not have been visited yet. Update-all-then-detect-all is the correct ordering.

The update pass is a linear iteration over SoA columns (exactly what the compiler optimizes for — just copying floats). The actual expensive work is inside `detectAll()`, and that cost is identical regardless of how data is fed in.

### Stale entity cleanup

Entities that had `Collider` removed or were deleted need to be unregistered from the service. Hook into `ConductRemoveComponent` / `ConductDeleteEntity` to call `collisionService.unregister(entity)`.

## Events System

General-purpose event infrastructure, not collision-specific.

### API

```typescript
// Emit — callable from anywhere (systems, services, etc.)
ConductEmitEvent(EventType, { ...data });

// Read — returns all events of that type this frame
ConductGetEvents(EventType); // -> EventData[]

// Events are cleared automatically at end of frame (after all systems run)
```

### Implementation notes

- Backed by a `Map<EventType, EventData[]>` cleared at end of frame.
- Events emitted by system A are readable by system B in the **same frame** (since systems run sequentially in registration order, no double-buffering needed).
- System ordering matters: producers must be registered before consumers. This is consistent with how the engine already works (e.g., InputSystem runs before movement systems). If a consumer runs before its producer, it sees nothing — that's a registration order bug.
- No compiler changes required. No Query integration. Just function calls, similar to `Inputs` and `deltaTime`.

### Why not Bevy-style injection?

The only argument for injecting events into Query parameters is scheduler dependency analysis for automatic parallelism — the scheduler can see which systems read/write which events and parallelize safely. Conduct systems run sequentially in registration order, so that doesn't apply. A simple function call is simpler, more flexible (usable outside systems), and requires no compiler changes.

## Frame Flow

```
1. InputSystem          — flushes input buffer
2. PlayerMovementSystem — moves player based on input
3. BulletMovementSystem — moves bullets
4. ColliderSystem       — updates collision service, detectAll(), emits CollisionEvents
5. DamageSystem         — reads CollisionEvents, applies damage / destroys entities
6. RendererSystem       — renders
7. (frame end)          — flush commands, clear events
```

Systems 4 and 5 show why same-frame event reading and system ordering matter — the damage response happens in the same frame as detection.

## Implementation Order

1. Events system (general-purpose infrastructure)
2. Collision components (`BoundingBox`, optionally `CollisionLayer`)
3. Collision service (standalone, brute-force to start)
4. ColliderSystem (bridges ECS iteration with collision service, emits events)