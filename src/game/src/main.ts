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
import { EventEmitter } from "../../conduct-ecs/event";
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

// class TestSpawn extends Component {}

class TestComponentOne extends Component {
  value = 0;
}
class TestComponentTwo extends Component {
  value!: number;
}
class TestComponentThree extends Component {
  value!: number;
}
class TestComponentFour extends Component {}

// class TestSpawnSystem implements System {
//   @Query()
//   update({ world }: SystemParams, _: TestSpawn) {
//     const e = world.createEntity();
//     world.addComponentToEntity(e, TestComponentOne, {
//       value: 0,
//     });
//
//     const ee = world.createEntity();
//     world.addComponentToEntity(ee, TestComponentOne, {
//       value: 0,
//     });
//     world.addComponentToEntity(ee, TestComponentTwo, {
//       value: 1,
//     });
//   }
// }

class TestSystemOne implements System {
  @Query()
  update({ world }: SystemParams, one: TestComponentOne) {
    one.value++;
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

class TestSystemFour implements System {
  @Query()
  update(_: SystemParams, abc: TestComponentFour) {
    //
  }
}

export default class MainGameStartSystem implements SystemInit {
  constructor(private events: EventEmitter) {}

  init(world: World) {
    console.log("GAME INIT >", world.gameHostType);

    world.registerBundle(new PlayerBundle()).registerSystem(new PlayerSystem());

    // testing
    // .registerSystem(new TestSystemOne())
    // .registerSystem(new TestSystemOneTwo())
    // .registerSystem(new TestSystemOneTwoThree())
    // .registerSystem(new TestSystemFour());

    if (world.gameHostType === "client") {
      world.spawnBundle(PlayerBundle);
    }

    world.start();
  }
}
