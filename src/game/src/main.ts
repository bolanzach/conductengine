import 'reflect-metadata';

import {
  Component,
  Network,
  NetworkedComponent,
  Query,
  System,
  SystemInit,
  SystemParams,
  World,
} from '../../conduct-ecs';
import { Bundle } from '../../conduct-ecs/bundle';
import { component } from '../../conduct-ecs/component';
import { Entity } from '../../conduct-ecs/entity';

class TestComponent extends Component {
  name!: string;
}

class TestNetworkComponent extends NetworkedComponent {
  name!: string;
}

class TestSystem implements System {
  @Query()
  update(params: SystemParams, td: TestComponent) {
    console.log('System Update', td.name, params.time.delta);
  }
}

class TestNetworkSystem implements System {
  counter = 0;
  @Query()
  update({ world }: SystemParams, networkComponent: TestNetworkComponent) {
    if (world.gameHostType === 'client') {
      console.log(Date.now().toString(), networkComponent.name);

      return;
    }

    this.counter++;
    if (this.counter >= 100) {
      networkComponent.name = Date.now().toString();
      this.counter = 0;
    }
  }
}

class PlayerBundle implements Bundle {
  build(player: Entity, w: World): Entity {
    w.addComponentToEntity(
      player,
      component(Network, {
        bundle: PlayerBundle.name,
      })
    ).addComponentToEntity(
      player,
      component(TestNetworkComponent, { name: 'player' })
    );

    return player;
  }
}

export default class MainGameStartSystem implements SystemInit {
  init(world: World) {
    console.log('GAME INIT >', world.gameHostType);

    world
      .registerBundle(new PlayerBundle())
      .registerSystem(new TestSystem())
      .registerSystem(new TestNetworkSystem());

    if (world.gameHostType === 'client') {
      world.spawnBundle(PlayerBundle);
    }

    world.start();
  }
}
