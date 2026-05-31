# Conduct ECS

Entity Component Systems (ECS) are all the **RAGE** right now.
At its core, Conduct implements a simple yet high-performance ECS system that allows you to define components and systems that operate on those components.

## Usage

`player.ts` Define a component class that holds data
```ts
class Player {
  id = 0;
  name = "";
}
```

`testSystem.ts` Define a System that operates on the data
```ts
export default function TestSystem(query: Query<[Player]>) {
  // Iterates over all entities that have the Player component
  query.iter(([_, player]) => {
    if (player.id === 42) {
      console.log(player.name, "has the answer!");
    }
  });
}
```

Then in your application entrypoint

```ts
import { ConductAddComponent, ConductRegisterSystem, ConductSpawnEntity, ConductStart } from "@conduct/ecs";

// Register the system
ConductRegisterSystem(TestSystem);

// Spawn an Entity
const p = ConductSpawnEntity();

// Add the Player component to the entity with some data
ConductAddComponent(p, [Player, { id: 42, name: "Gadnuck" }]);

// Once all systems are registered, run the main loop
ConductStart();
```

### Bundles

For convenience, you define a **bundle** that describes how to construct an entity with multiple components.

```ts
import { ConductSpawnBundle } from "@conduct/ecs";

const PlayerBundle = [
  [Player, { id: 1, name: "Alice" }],
  [Health, { hp: 100 }],
  [Position],
];

const entity = ConductSpawnBundle(PlayerBundle);

// Bundles are meant to be composed:
function spawnPlayer(id: number, name: string) {
  return ConductSpawnBundle([
    ...PlayerBundle, // Reuse the PlayerBundle for common components
    [Player, { id, name }], // Override the Player component with specific data
  ]);
}
```
