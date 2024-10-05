import 'reflect-metadata';

import { render } from "conduct-renderer";

import { Component } from 'conduct-ecs/lib/component';
import { Query, System } from "conduct-ecs/lib/system";
import type { SystemParams } from "conduct-ecs/lib/system";
import { World } from "conduct-ecs/lib";

class TestComponent extends Component {
  name: string = "test component"
}

class TestSystem implements System {
  @Query()
  Update(params: SystemParams, t: TestComponent) {
    console.log('TestSystem: ', params.entity, t.name);
  }
}

const world = new World();

world.RegisterSystem(new TestSystem());

const e1 = world.CreateEntity();
world.AddEntityComponent(e1, new TestComponent());

world.TestStart();


render();
