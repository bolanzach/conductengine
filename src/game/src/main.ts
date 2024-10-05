import 'reflect-metadata';

import { Component, Query, System, SystemParams, World } from '../../conduct-ecs';
import { WorldConfig } from '../../conduct-ecs/world';

////// MOVE THIS
interface GameInstanceConfig extends WorldConfig {
  gameHost: "client" | "server",
  setup: (w: World) => void,
}

class TestComponent extends Component {
  name = 'Test-Component';
}

class TestSystem implements System {
  @Query()
  Update(params: SystemParams, td: TestComponent) {
    console.log('System Update', td.name, params.time.delta);
  }
}


export default function main(config: GameInstanceConfig): void {
  console.log("game init >", config.gameHost);

  const w = new World(config).RegisterSystem(new TestSystem());

  const entity = w.CreateEntity();
  w.AddEntityComponent(entity, new TestComponent());

  w.start()
  console.log("game started!")
}

