import { System } from '../system';
import { Component } from '../component';
import { Entity } from '../entity';
import { World } from '../main';
import { QueryForComponents, QueryWithoutComponents } from '../system';

class TestComponent extends Component {
  msg!: string;
}

class TestTwoComponent extends Component {
  name!: string;
}

class TestThreeComponent extends Component {
  name!: string;
}

class TestSystem implements System {
  @QueryForComponents
  update(e: Entity, t: TestComponent, z: TestTwoComponent) {
    console.log('TestSystem: ', e, t.msg);
  }
}

class TestSystemTwo implements System {
  @QueryForComponents
  @QueryWithoutComponents(TestTwoComponent)
  update(e: Entity, t: TestComponent) {
    console.log('TestSystemTwo: ', e, t.msg);
  }
}

class TestSystemThree implements System {
  @QueryForComponents
  @QueryWithoutComponents(TestTwoComponent)
  update(e: Entity, one: TestComponent, three: TestThreeComponent) {
    console.log('TestSystemThree: ', e, three.name);
  }
}

class TestSystemFour implements System {
  @QueryForComponents
  update(
    e: Entity,
    one: TestComponent,
    two: TestTwoComponent,
    three: TestThreeComponent
  ) {
    console.log('TestSystemFour: ', e);
  }
}

const world = new World();

world
  .registerSystem(new TestSystem())
  .registerSystem(new TestSystemTwo())
  .registerSystem(new TestSystemThree())
  .registerSystem(new TestSystemFour());

const test = new TestComponent();
test.msg = 'hellooooo';

const entity0 = world.createEntity();
world.addEntityComponent(entity0, test);
world.addEntityComponent(entity0, new TestTwoComponent());

const entity1 = world.createEntity();
world.addEntityComponent(entity1, new TestComponent());

const entity2 = world.createEntity();
world.addEntityComponent(entity2, new TestComponent());
world.addEntityComponent(entity2, new TestTwoComponent());

const entity3 = world.createEntity();
const t3 = new TestThreeComponent();
t3.name = 'asdfasdfsfd';
world.addEntityComponent(entity3, new TestComponent());
world.addEntityComponent(entity3, t3);

const entity4 = world.createEntity();

world.addEntityComponent(entity4, new TestComponent());
world.addEntityComponent(entity4, new TestTwoComponent());
world.addEntityComponent(entity4, new TestThreeComponent());

world.testStart();
