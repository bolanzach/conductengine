# Conduct ECS

Entity Component Systems (ECS) are all the **RAGE** right now.
At its core, Conduct implements a simple yet high-performance ECS system that allows you to define components and systems that operate on those components.

## Usage

`person.ts` Define a component class that holds data
```ts
class Person {
  name = "";
  age = 0;
}
```

`testSystem.ts` Define a System that operates on the data
```ts
export default function TestSystem(query: Query<[Person]>) {
  // Iterates over all entities that have the Person component
  query.iter(([_, person]) => {
    if (person.age > 100) {
      console.log(person.name, "is old!");
    }
  });
}
```

`main.ts` Your main entrypoint

```ts
import { ConductAddComponent, ConductRegisterSystem, ConductSpawnEntity, ConductStart } from "@conduct/ecs";

// Register the system
ConductRegisterSystem(TestSystem);

// Spawn an Entity
const p = ConductSpawnEntity();

// Add the Person component to the entity with some data
ConductAddComponent(p, [Person, { age: 69 }]);

// Once all systems are registered, run the main loop
ConductStart();
```
