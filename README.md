# Conduct Engine

#### Who says you can't have a game engine in Typescript

Entity Component Systems are all the RAGE right now so I wanted to build a toy one. We'll see how far I take this.

## Usage

Check out the [demo](./src/ecs/demo/index.ts).

```ts
// Define a component that holds data
class MyComponent extends Component {
  constructor(public msg: string) {
    super();
  }
}

// Define a System that operates on the data
class MySystem implements System {
  @Query()
  Update({ entity, world }: SystemParams, myC: MyComponent) {
    console.log('MySystem: ', entity, myC.msg);
  }
}

// Setup your world with Entities
const world = new World();
world.RegisterSystem(new TestSystem())

const entity = world.CreateEntity();
world.AddEntityComponent(entity, new MyComponent("hello"));

// Only a test for now
world.TestStart();
```