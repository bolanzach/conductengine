# Conduct ECS

Entity Component Systems (ECS) are all the **RAGE** right now.
At its core, Conduct implements a simple ECS system that allows you to define components and systems that operate on those components.

## Usage


```ts
import {
  Component,
  Query,
  System,
  SystemParams,
  World,
  WorldConfig,
} from '@conduct-ecs';

// Define a component that holds data
class MyComponent extends Component {
  msg = "hello";
}

// Define a System that operates on the data
class MySystem implements System {
  @Query()
  update({ entity, world }: SystemParams, myC: MyComponent) {
    console.log('MySystem: ', entity, myC.msg);
  }
}

// Setup your world
const world = new World();

// Register the system
world.registerSystem(new TestSystem())

// Add entities to the world
const entity = world.createEntity();

// Add components to the entity
world.addEntityComponent(entity, new MyComponent());

// Start the game loop
world.start();
```