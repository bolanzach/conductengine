import "reflect-metadata";

import {
  Component,
  Network,
  NetworkedComponent,
  Query,
  System,
  SystemInit,
  SystemParams,
  World,
} from "../../conduct-ecs";
import PlayerBundle from "./bundles/player";
import PlayerSystem from "./systems/playerSystem";

// class TestNetworkComponent extends NetworkedComponent {
//   name!: string;
// }
//
// class TestNetworkSystem implements System {
//   counter = 0;
//
//   @Query()
//   update({ world }: SystemParams, networkComponent: TestNetworkComponent) {
//     if (world.gameHostType === 'client') {
//       console.log(Date.now().toString(), networkComponent.name);
//       return;
//     }
//
//     this.counter++;
//     if (this.counter >= 100) {
//       networkComponent.name = Date.now().toString();
//       this.counter = 0;
//     }
//   }
// }

class TestComponentOne extends Component {}
class TestComponentTwo extends Component {}
class TestComponentThree extends Component {}

class TestSystemOne implements System {
  @Query()
  update({ world }: SystemParams, one: TestComponentOne) {
    //
  }
}

class TestSystemOneTwo implements System {
  @Query()
  update(
    { entity }: SystemParams,
    one: TestComponentOne,
    two: TestComponentTwo
  ) {
    console.log(entity, one, two);
    //
  }
}

export default class MainGameStartSystem implements SystemInit {
  init(world: World) {
    console.log("GAME INIT >", world.gameHostType);

    world
      .registerBundle(new PlayerBundle())
      .registerSystem(new PlayerSystem())

      // testing
      // .registerSystem(new TestSystemOne())
      .registerSystem(new TestSystemOneTwo());

    // if (world.gameHostType === "client") {
    //   world.spawnBundle(PlayerBundle);
    // }

    const a = world.createEntity();
    world.addComponentToEntity(a, TestComponentOne, {});

    const b = world.createEntity();
    world.addComponentToEntity(b, TestComponentOne, {});
    world.addComponentToEntity(b, TestComponentTwo, {});

    const e = world.createEntity();
    world.addComponentToEntity(e, TestComponentThree, {});

    const c = world.createEntity();
    world.addComponentToEntity(c, TestComponentOne, {});
    world.addComponentToEntity(c, TestComponentTwo, {});

    world.start();

    const d = world.createEntity();
    world.addComponentToEntity(d, TestComponentOne, {});
    world.addComponentToEntity(d, TestComponentTwo, {});

    const f = world.createEntity();
    world.addComponentToEntity(f, TestComponentThree, {});
  }
}
