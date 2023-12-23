import { Query, System } from '../system';
import { Component } from '../component';
import { Entity } from '../entity';
import { World } from '../main';

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
  @Query()
  Update(e: Entity, t: TestComponent, z: TestTwoComponent) {
    console.log('TestSystem: ', e, t.msg);
  }
}

class TestSystemTwo implements System {
  @Query({
    Without: [TestTwoComponent],
  })
  Update(e: Entity, t: TestComponent) {
    console.log('TestSystemTwo: ', e, t.msg);
  }
}

class TestSystemThree implements System {
  @Query({
    Without: [TestTwoComponent],
  })
  Update(e: Entity, one: TestComponent, three: TestThreeComponent) {
    console.log('TestSystemThree: ', e, three.name);
  }
}

class TestSystemFour implements System {
  @Query()
  Update(
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
  .RegisterSystem(new TestSystem())
  .RegisterSystem(new TestSystemTwo())
  .RegisterSystem(new TestSystemThree())
  .RegisterSystem(new TestSystemFour());

const test = new TestComponent();
test.msg = 'hellooooo';

const entity0 = world.CreateEntity();
world.AddEntityComponent(entity0, test);
world.AddEntityComponent(entity0, new TestTwoComponent());

const entity1 = world.CreateEntity();
world.AddEntityComponent(entity1, new TestComponent());

const entity2 = world.CreateEntity();
world.AddEntityComponent(entity2, new TestComponent());
world.AddEntityComponent(entity2, new TestTwoComponent());

const entity3 = world.CreateEntity();
const t3 = new TestThreeComponent();
t3.name = 'asdfasdfsfd';
world.AddEntityComponent(entity3, new TestComponent());
world.AddEntityComponent(entity3, t3);

const entity4 = world.CreateEntity();

world.AddEntityComponent(entity4, new TestComponent());
world.AddEntityComponent(entity4, new TestTwoComponent());
world.AddEntityComponent(entity4, new TestThreeComponent());

world.TestStart();
