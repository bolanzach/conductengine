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
  // Iterates over all entities that have the PersonComponent
  query.iter(([entity, person]) => {
    if (person.age > 40) {
      console.log(person.name, "is old!");
    }
  });
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
  value = "";
}

class AgeComponent extends Component {
  value = 0;
}

// This tags an entity as a person
class PersonComponent extends Component {}

class DogComponent extends Component {
  breed = "";
}

function PersonSystem(query: Query<[PersonComponent, NameComponent, AgeComponent]>) {
  query.iter(([entity, person, name, age]) => {
    if (age.value > 40) {
      console.log(name.value, "is old!");
    }
  });
}

function DogSystem(query: Query<[DogComponent, NameComponent]>) {
  query.iter(([entity, dog, name]) => {
    console.log(name.value, "is a", dog.breed);
  });
}
```

Systems can declare multiple queries to allow entities to interact

```ts
class TransformComponent extends Component {
  x = 0;
  y = 0;
}

class MissileComponent extends Component {}
class TargetComponent extends Component {}

function MissileTargetSystem(
  missileQuery: Query<[MissileComponent, TransformComponent]>,
  targetQuery: Query<[TargetComponent, TransformComponent]>,
) {
  missileQuery.iter(([missileEntity, missile, missileTransform]) => {
    targetQuery.iter(([targetEntity, target, targetTransform]) => {
      if (distance(missileTransform, targetTransform) < 10) {
        console.log("Missile hit target!");
      }
    });
  });
}
```