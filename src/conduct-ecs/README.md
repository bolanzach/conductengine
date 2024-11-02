# Conduct ECS

Entity Component Systems (ECS) are all the **RAGE** right now.
At its core, Conduct implements a simple ECS system that allows you to define components and systems that operate on those components.

## Usage

```ts
import {
  Component,
  Query,
  System,
  World,
} from '@conduct-ecs';

// Define a component that holds data
class PersonComponent extends Component {
  name = "";
  age = 0;
}

// Define a System that operates on the data
// A system is just a function!
function TestSystem(query: Query<[PersonComponent]>) {
  // Iterates over all entities that have the TestComponent
  for (const [entity, person] of query) {
    console.log(person.name);
  }
}

// Setup your world
const world = new World();

// Register the system
world.registerSystem(TestSystem)

// Add entities to the world
const entity = world.addEntity();

// Add components to the entity
world.addEntityComponent(entity, PersonComponent, {
  message: "Conduct",
  age: 42,
});

// Start the game loop
// This will run the TestSystem every tick
world.start();
```

But a lot of other types of "things" can have a `name` property - not just People!
In ECS  (and good design in general), we want to compose our systems of small, reusable parts.
Let's refactor to several components.

```ts
class NameComponent extends Component {
  name = "";
}

class AgeComponent extends Component {
  age = 0;
}

class PersonComponent extends Component {}

class DogComponent extends Component {
  breed = "";
}

function PersonSystem(query: Query<[PersonComponent, NameComponent, AgeComponent]>) {
  for (const [entity, person, name, age] of query) {
    // Do something with the person
  }
}

function DogSystem(query: Query<[DogComponent, NameComponent]>) {
  for (const [entity, dog, name] of query) {
    // Do something with the dog
  }
}
```