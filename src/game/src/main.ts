import 'reflect-metadata';

import {
  Component,
  NetworkedTransform,
  Query,
  System,
  SystemParams,
  World,
  WorldConfig,
} from '../../conduct-ecs';
import { BuildBundleData, Bundle } from '../../conduct-ecs/bundle';
import { component } from '../../conduct-ecs/component';
import { NetworkComponent } from '../../conduct-ecs/components/network';
import { Entity } from '../../conduct-ecs/entity';
import { getNetworkId } from '../../conduct-ecs/network';
import NetworkSystem, {
  WsConnection,
} from '../../conduct-ecs/systems/networkSystem';

////////////////////
////// MOVE THESE
interface GameInstanceConfig extends WorldConfig {
  wsConnection: WsConnection;
}

////////////////////

class TestComponent extends Component {
  name!: string;
}

class TestSystem implements System {
  @Query()
  update(params: SystemParams, td: TestComponent) {
    console.log('System Update', td.name, params.time.delta);
  }
}

class PlayerBundle implements Bundle {
  build(w: World, data: BuildBundleData): Entity {
    const player = w.createEntity();
    w.addEntityComponent(
      player,
      component(NetworkComponent, {
        networkId: getNetworkId(),
        authority: 'client',
        bundle: PlayerBundle.name,
        isSpawned: data.isSpawned ?? false,
      })
    ).addEntityComponent(player, component(TestComponent, { name: 'zach' }));

    return player;
  }
}

export default function main(config: GameInstanceConfig): void {
  console.log('game init >', config.gameHost);

  const w = new World(config)
    .registerBundle(new PlayerBundle())
    .registerSystem(new TestSystem())
    .registerSystem(new NetworkSystem(config.wsConnection));

  w.buildBundle(PlayerBundle);

  w.start();
  console.log('game started!');
}
