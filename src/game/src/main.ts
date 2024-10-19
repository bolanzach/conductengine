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

class TestComponentOne extends Component {
  value!: number;
}
class TestComponentTwo extends Component {
  value!: number;
}
class TestComponentThree extends Component {
  value!: number;
}

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
    one.value += two.value;
  }
}

class TestSystemOneTwoThree implements System {
  @Query()
  update(
    { entity }: SystemParams,
    one: TestComponentOne,
    two: TestComponentTwo,
    three: TestComponentThree
  ) {
    three.value += one.value - two.value;
  }
}

export default class MainGameStartSystem implements SystemInit {
  init(world: World) {
    console.log("GAME INIT >", world.gameHostType);

    world
      .registerBundle(new PlayerBundle())
      .registerSystem(new PlayerSystem())

      // testing
      .registerSystem(new TestSystemOne())
      .registerSystem(new TestSystemOneTwo())
      .registerSystem(new TestSystemOneTwoThree());

    // if (world.gameHostType === "client") {
    //   world.spawnBundle(PlayerBundle);
    // }

    // const a = world.createEntity();
    // world.addComponentToEntity(a, TestComponentOne, {});
    //
    // const b = world.createEntity();
    // world.addComponentToEntity(b, TestComponentOne, {});
    // world.addComponentToEntity(b, TestComponentTwo, {});

    // const e = world.createEntity();
    // world.addComponentToEntity(e, TestComponentThree, {});
    //
    // const c = world.createEntity();
    // world.addComponentToEntity(c, TestComponentOne, {});
    // world.addComponentToEntity(c, TestComponentTwo, {});

    for (let i = 0; i < 9999; i++) {
      const entity = world.createEntity();
      world.addComponentToEntity(entity, TestComponentOne, { value: i });
      world.addComponentToEntity(entity, TestComponentTwo, { value: i });
      world.addComponentToEntity(entity, TestComponentThree, { value: 0 });
    }

    world.start();

    // const d = world.createEntity();
    // world.addComponentToEntity(d, TestComponentOne, {});
    // world.addComponentToEntity(d, TestComponentTwo, {});
    //
    // const f = world.createEntity();
    // world.addComponentToEntity(f, TestComponentThree, {});
  }
}
