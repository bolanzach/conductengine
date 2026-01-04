# Conduct ECS

Entity Component Systems (ECS) are all the **RAGE** right now.
At its core, Conduct implements a simple yet high-performance ECS system that allows you to define components and systems that operate on those components.

## Usage

```ts
// Define a component class that holds data
class Person {
  name = "";
  age = 0;
}

// Define a System that operates on the data
export default function TestSystem(query: Query<[Person]>) {
  // Iterates over all entities that have the Person component
  query.iter(([_, person]) => {
    if (person.age > 100) {
      console.log(person.name, "is old!");
    }
  });
}

// Register the system
registerSystem(TestSystem);

// Spawn an Entity
const p = spawnEntity();

// Add the Person component to the entity with some data
addComponent(p, [Person, { age: 69 }]);

// Once all systems are registered, run the main loop
startConduct();
```
