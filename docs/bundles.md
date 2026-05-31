# Bundle System Design

## Context

Bundles are the mechanism for spawning entities with a predefined set of components. The current implementation uses parameterless factory functions (`() => ConductEntity`) registered in a numeric ID registry. This works for the networking layer (client looks up a bundle by ID to spawn a replicated entity), but leaves open questions about parameterization, composition, and maintainability.

This doc captures design decisions for evolving the bundle system.

## Current System

### How it works

A bundle is a factory function that imperatively creates an entity and adds components:

```typescript
export type ConductBundle = () => ConductEntity;

const bundles: BundleRegistry = {
  [BUNDLE.PLAYER]: () => {
    const entity = ConductSpawnEntity();
    ConductAddComponent(entity, Transform3D);
    ConductAddComponent(entity, Networked, { bundle: BUNDLE.PLAYER });
    return entity;
  },
};
```

Client and server each define their own registry. The client registry includes rendering components (MeshRenderer, Material) that the server omits. The networking layer stores the bundle ID in the `Networked` component, and the client uses it to look up the correct factory when spawning replicated entities.

### What works

- Simple and functional for the networking use case
- Client and server can have different component sets for the same bundle ID
- The network receive system spawns via the parameterless factory, then applies replicated component data on top — so the factory only needs to set up the component **structure**, not specific values

### Problems

1. **Client/server duplication**: The client PLAYER bundle is a copy-paste of the server bundle with rendering components appended. Adding a component to the server bundle requires remembering to update the client bundle too.

2. **Parameterization**: The factory takes no arguments. Spawning a unit at a specific position requires a two-step pattern — spawn with defaults, then overwrite:
   ```typescript
   const entity = bundles[BUNDLE.PLAYER]!();
   ConductAddComponent(entity, Transform3D, { x: 10, z: 5 });
   ```

3. **Imperative, not composable**: Because the factory calls `ConductSpawnEntity()` internally, the caller has no way to influence component data before the entity exists. Bundles can't be merged, extended, or inspected.

## Why Parameterization Isn't a Registry Problem

The registry is only used in one place: the client network receive system. When the client receives a snapshot for a new entity, it:

1. Extracts the bundle ID from the `Networked` component
2. Calls the parameterless factory to create the entity with the right components
3. Overwrites component values with replicated data from the server

The factory's default values are irrelevant — they get replaced immediately by the server's data. The registry never needs parameters because **the server sends the real values via replication**.

Parameterized spawning is a **game logic** concern (server-side code that creates entities with specific attributes). It doesn't need to go through the registry. These are separate concepts:

- **Registry**: "what components does this entity type have?" (structural)
- **Game logic**: "spawn this entity type with these specific values" (parameterized)

Game logic convenience functions have their own typed signatures and are independent of the registry:

```typescript
// Registry: parameterless, used by network
[BUNDLE.UNIT]: () => { ... }

// Game logic: typed, used by server code
function spawnUnit(x: number, z: number, team: number): ConductEntity {
  const entity = bundles[BUNDLE.UNIT]();
  ConductAddComponent(entity, Transform3D, { x, z });
  ConductAddComponent(entity, Team, { id: team });
  return entity;
}
```

Each game logic function has its own typed signature. No generic bag of optional params. No change to `ConductBundle`.

## Data-Oriented Bundles

The bigger design improvement is making bundles return **data** instead of imperatively creating entities. This solves the composition and duplication problems.

### Bundles as component lists

A bundle is an array of `[Component, data?]` entries. The engine owns entity creation:

```typescript
type ComponentEntry = [component: ComponentConstructor, data?: Record<string, any>];
type Bundle = ComponentEntry[];

function ConductSpawnBundle(bundle: Bundle): ConductEntity {
  const entity = ConductSpawnEntity();
  for (const [comp, data] of bundle) {
    ConductAddComponent(entity, comp, data);
  }
  return entity;
}
```

### Composition via spread

Client bundles extend shared bundles instead of duplicating them:

```typescript
// shared/bundles.ts — single source of truth
function PlayerBundle(): Bundle {
  return [
    [Transform3D],
    [Networked, { bundle: BUNDLE.PLAYER }],
  ];
}

// client — extends, doesn't duplicate
function PlayerBundleClient(): Bundle {
  return [
    ...PlayerBundle(),
    [MeshRenderer, { meshId: MESH.CUBE }],
    [Material, { r: 0.2, g: 0.6, b: 1.0 }],
  ];
}
```

Adding `Health` to `PlayerBundle` automatically includes it on the client. One definition to maintain for the structural components.

### Parameterization via function arguments

For game logic spawning, bundle functions take typed args that flow into component data:

```typescript
// shared/bundles.ts — single source of truth
function UnitBundle(): Bundle {
   return [
      [Transform3D],
      [Networked, { bundle: BUNDLE.UNIT }],
   ];
}

// in server game logic — parameterized spawn helper, not used by network
function SpawnUnit(x: number, z: number): Bundle {
  return [
    ...UnitBundle(), // composition
    [Transform3D, { x, z }], // parameterization. Note that this overwrites the Transform3D from the UnitBundle
  ];
}

// Server game logic
ConductSpawnBundle(UnitBundle(10, 5));
```

### Client visual mapping (optional, don't need this now)

Instead of writing a full client bundle function per entity type, the client could register a declarative mapping of extra components per bundle:

```typescript
const clientVisuals: Record<number, Bundle> = {
  [BUNDLE.PLAYER]: [[MeshRenderer, { meshId: MESH.CUBE }], [Material, { r: 0.2, g: 0.6, b: 1.0 }]],
  [BUNDLE.GROUND]: [[MeshRenderer, { meshId: MESH.CUBE }], [Material, { r: 0.1, g: 0.5, b: 0.3 }]],
};
```

The network receive system would spawn using the shared bundle, then append the client visuals automatically. This reduces the per-bundle client maintenance to a flat table of rendering data.

## What to maintain

With data-oriented bundles and a client visual mapping, the per-entity-type maintenance is:

| What | Where | Purpose |
|------|-------|---------|
| Bundle function | Shared code | Component structure + defaults |
| Visual entry | Client-only table | Rendering components for this bundle type |
| Convenience functions | Server game logic (optional) | Typed, parameterized spawn helpers |

The bundle function is the single source of truth for what components an entity type has. The visual entry is a one-liner. Convenience functions are optional call-site sugar — not a separate maintained definition, just named wrappers around `ConductSpawnBundle(Bundle(...args))`.

## Bevy Reference

Bevy went through a similar evolution:

1. **Named bundle structs** (pre-0.15) — `SpriteBundle`, `PbrBundle`, etc. Explicit but verbose, every bundle had to manually include transitive dependencies.

2. **Required components** (0.15) — Components declare their own dependencies (`Sprite` requires `Transform`). Bundles became mostly unnecessary because spawning a single component pulls in its dependency tree.

3. **Factory functions returning `impl Bundle`** (0.16) — Parameterized templates via regular functions that return tuples of components. No builder pattern, no generic bag. The function returns data, not a handle.

Key insight from Bevy's networking ecosystem (bevy_replicon, lightyear): **replication is component-based, not bundle-based.** The network layer registers individual components for replication and marks entities with a marker component. Bundles are irrelevant at the network layer — they're purely a spawn-time convenience. This matches our architecture.

### Required components (future consideration)

Orthogonal to bundles, but worth noting: components could declare their own dependencies:

```typescript
class MeshRenderer {
  meshId = 0;
  static requires = [Transform3D];
}
```

Adding `MeshRenderer` to an entity would automatically ensure `Transform3D` exists. This would further reduce what bundles need to specify and make component dependencies self-documenting. Bevy found this valuable enough to deprecate all their built-in named bundle structs in favor of it.

## Implementation Priority

This is not urgent. The current system works for the networking MVP. The data-oriented refactor becomes valuable when:

- More bundle types are added and client/server duplication becomes a real maintenance burden
- Game logic needs parameterized spawning in multiple places
- Bundle composition is needed (e.g., a "HeavyUnit" bundle that extends "Unit" with armor components)