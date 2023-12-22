import 'reflect-metadata';

import {
  COMPONENT_TYPE,
  Component,
  ComponentConstructor,
  TestComponent,
  TestThreeComponent,
  TestTwoComponent,
} from './component';
import { Entity } from './entity';
import {
  REGISTERED_SYSTEMS,
  System,
  TestSystem,
  TestSystemThree,
  TestSystemTwo,
} from './system';

type ComponentTable = Map<ComponentConstructor, Array<Component | null>>;

export class World {
  #entityList: Array<Entity> = [];
  #componentCount: Map<ComponentConstructor, number> = new Map();
  #systems: Map<Function, System> = new Map();
  #componentTable: ComponentTable = new Map();

  createEntity(): Entity {
    const entity = this.#entityList.length;
    this.#entityList[entity] = entity;

    // Update the table to include the new entity
    this.#componentTable.forEach((componentList, componentType) => {
      this.#componentTable.set(componentType, [...componentList, null]);
    });

    return entity;
  }

  addEntityComponent<T extends Component>(entity: Entity, component: T) {
    if (!this.#componentTable.has(component[COMPONENT_TYPE])) {
      this.#componentTable.set(
        component[COMPONENT_TYPE],
        new Array(this.#entityList.length).fill(null)
      );
    }

    const componentList = this.#componentTable.get(component[COMPONENT_TYPE]);
    if (!componentList) {
      return;
    }

    componentList[entity] = component;

    // Cache the count of how many components of this type exist
    this.#componentCount.set(
      component[COMPONENT_TYPE],
      componentList.reduce((acc, c) => acc + (c ? 1 : 0), 0)
    );
  }

  getEntityComponent<TComponent extends ComponentConstructor>(
    entity: Entity,
    component: TComponent
  ): InstanceType<TComponent> | null {
    const componentList = this.#componentTable.get(component);

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

  registerSystem(system: System): World {
    this.#systems.set(system.constructor, system);
    return this;
  }

  testStart() {
    this.#systems.forEach((system, scstr) => {
      const systemComponentTypes = REGISTERED_SYSTEMS.get(scstr);
      if (!systemComponentTypes) {
        return;
      }

      // Sorts the components to query by the least common component type, allowing us to more quickly
      // ignore entities that don't have a component
      const componentsToQuery = systemComponentTypes.queryWith.sort((a, b) => {
        const aCount = this.#componentCount.get(a) ?? Infinity;
        const bCount = this.#componentCount.get(b) ?? Infinity;
        return aCount - bCount;
      });

      // This is what we're trying to build up to
      const componentInstances: Array<[Entity, Component[]]> = [];

      for (let entity = 0; entity < this.#entityList.length; entity++) {
        const components: Array<Component> = [];

        // Check that the entity has all the components that are to be queried
        for (let i = 0; i < componentsToQuery.length; i++) {
          const componentType = componentsToQuery[i];
          const componentTypeRow = this.#componentTable.get(componentType);
          if (!componentTypeRow) {
            return;
          }

          const component = componentTypeRow[entity];
          if (!component) {
            // The component instance is null for this entity, so the entity does not have the component and should be excluded
            break;
          }

          components.push(component);
        }

        if (components.length === componentsToQuery.length) {
          // All components were found for this entity, so now check if the entity has any of the components that are to be excluded
          let querySuccess = true;
          for (let i = 0; i < systemComponentTypes.queryWithout.length; i++) {
            const componentType = systemComponentTypes.queryWithout[i];
            const componentTypeRow = this.#componentTable.get(componentType);
            if (!componentTypeRow) {
              return;
            }

            const withoutComponent = componentTypeRow[entity];
            if (withoutComponent) {
              // The instance is NOT null, so the entity has the component and should be excluded
              querySuccess = false;
              break;
            }
          }

          if (querySuccess) {
            componentInstances.push([entity, components]);
          }
        }
      }

      componentInstances.forEach(([entity, components]) =>
        system.update(entity, ...components)
      );
    });
  }
}

////// Main

const world = new World();

world.registerSystem(new TestSystem());
world.registerSystem(new TestSystemTwo());
world.registerSystem(new TestSystemThree());

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
world.addEntityComponent(entity3, new TestComponent());
world.addEntityComponent(entity3, new TestThreeComponent());
world.addEntityComponent(entity3, new TestThreeComponent());

const entity4 = world.createEntity();
world.addEntityComponent(entity4, new TestComponent());
world.addEntityComponent(entity4, new TestTwoComponent());
world.addEntityComponent(entity4, new TestThreeComponent());

world.testStart();
