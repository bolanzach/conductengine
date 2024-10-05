import 'reflect-metadata';

import { GameServer } from './gameServer';
import { Component, Query, System, SystemParams, World } from '../conduct-ecs';

const gameServer = new GameServer();

gameServer.start();

console.log("game starting...")

class TestComponent extends Component {
  name = 'Test-Component';
}

class TestSystem implements System {
  @Query()
  Update(params: SystemParams, td: TestComponent) {
    console.log('System Update', td.name);
  }
}

const w = new World().RegisterSystem(new TestSystem());

const entity = w.CreateEntity();
w.AddEntityComponent(entity, new TestComponent());

w.TestStart();

console.log("game started!")
