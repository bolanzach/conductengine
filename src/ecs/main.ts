import { COMPONENT_TYPE, Component, ComponentConstructor } from './component';
import { Entity } from './entity';

type ComponentTable = Map<ComponentConstructor, Array<Component | null>>;

export class World {
  #entityList: Array<Entity> = [];
  #table: ComponentTable = new Map();

  createEntity(): Entity {
    const entity = this.#entityList.length;
    this.#entityList.push(entity);
    return entity;
  }

  addEntityComponent<T extends Component>(entity: Entity, component: T) {
    if (!this.#table.has(component[COMPONENT_TYPE])) {
      this.#table.set(
        component[COMPONENT_TYPE],
        new Array(this.#entityList.length).fill(null)
      );
    }

    const componentList = this.#table.get(component[COMPONENT_TYPE]);
    if (!componentList) {
      return;
    }

    componentList[entity] = component;
  }

  getEntityComponent<TComponent extends ComponentConstructor>(
    entity: Entity,
    component: TComponent
  ): InstanceType<TComponent> | null {
    const componentList = this.#table.get(component);

    if (componentList) {
      const foundComponent = componentList[entity];
      if (
        foundComponent !== null &&
        foundComponent[COMPONENT_TYPE] === component
      ) {
        // We now know the foundComponent instance has a constructor of type TComponent so this is safe
        return foundComponent as InstanceType<TComponent>;
      }
    }

    return null;
  }
}

//////
class TestComponent extends Component {
  msg!: string;
}

class ZachComponent extends Component {
  name!: string;
}

const world = new World();

const test = new TestComponent();
test.msg = 'hellooooo';

const entity = world.createEntity();

world.addEntityComponent(entity, test);

const c = world.getEntityComponent(entity, TestComponent);

if (c) {
  console.dir(c.msg);
} else {
  console.log('nope');
}
