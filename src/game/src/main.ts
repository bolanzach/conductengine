import 'reflect-metadata';

import { Component, Query, System, SystemParams, World } from '../../conduct-ecs';

////// MOVE THIS
interface GameInstanceConfig {
  gameHost: "client" | "server"
}

class TestComponent extends Component {
  name = 'Test-Component';
}

class TestSystem implements System {
  @Query()
  Update(params: SystemParams, td: TestComponent) {
    console.log('System Update', td.name);
  }
}


export default function main(config: GameInstanceConfig): void {
  console.log("game init");

  if (config.gameHost === "client") {
    console.log("client init");
  } else if (config.gameHost === "server") {
    console.log("server init");
  }

  const w = new World().RegisterSystem(new TestSystem());

  const entity = w.CreateEntity();
  w.AddEntityComponent(entity, new TestComponent());

  w.TestStart();
  console.log("game started!")
}

