import 'reflect-metadata';

import {
  NetworkedComponent,
  Query,
  System,
  SystemInit,
  SystemParams,
  World,
} from '../../conduct-ecs';
import PlayerBundle from './bundles/player';

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

export default class MainGameStartSystem implements SystemInit {
  init(world: World) {
    console.log('GAME INIT >', world.gameHostType);

    world.registerBundle(new PlayerBundle());

    if (world.gameHostType === 'client') {
      world.spawnBundle(PlayerBundle);
    }

    world.start();
  }
}
