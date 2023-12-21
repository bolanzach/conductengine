const COMPONENT_TYPE = Symbol('COMPONENT_TYPE');

type ComponentConstructor<T extends Component = Component> = new () => T;

abstract class Component {
  protected readonly [COMPONENT_TYPE]: ComponentConstructor = this.constructor as ComponentConstructor;
}

class TestComponent extends Component {
  msg!: string;
}

class ZachComponent extends Component {
  name!: string;
}

type ComponentTable = Map<ComponentConstructor, Array<Component | null>>;
const table: ComponentTable = new Map();

type Entity = number;
const entityList: Array<Entity> = [0];

function addEntityComponent<T extends Component>(entity: Entity, component: T) {
  if (table.has(component[COMPONENT_TYPE])) {
    table.set(component[COMPONENT_TYPE], new Array(entityList.length).fill(null));
  }

  table.set(component[COMPONENT_TYPE], [component]);
}

function getEntityComponent<TComponent extends ComponentConstructor>(entity: Entity, component: TComponent): InstanceType<TComponent> | null {
  const componentList = table.get(component);

  if (componentList) {
    const foundComponent = componentList[entity];
    if (foundComponent !== null && foundComponent[COMPONENT_TYPE] === component) {
      // We now know the foundComponent has a constructor of type TComponent so this is safe
      return foundComponent as InstanceType<TComponent>;
    }
  }

  return null;
}


//////
const test = new TestComponent();
test.msg = 'hellooooo';
addEntityComponent(0, test)

const c = getEntityComponent(0, TestComponent)

if (c) {
  console.dir(c.msg);
} else {
  console.log('nope');
}






