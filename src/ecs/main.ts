import 'reflect-metadata';

import {
  COMPONENT_TYPE,
  Component,
  ComponentConstructor,
  TestComponent,
  ZachComponent,
} from './component';
import { Entity } from './entity';
import { REGISTERED_SYSTEMS, System, TestSystem } from './system';

type ComponentTable = Map<ComponentConstructor, Array<Component | null>>;

export class World {
  #entityList: Array<Entity> = [];
  #systems: Map<Function, System> = new Map();
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

  registerSystem(system: System): World {
    this.#systems.set(system.constructor, system);
    return this;
  }

  testStart() {
    // Iterate each system
    this.#systems.forEach((system, scstr) => {
      const systemComponentTypes = REGISTERED_SYSTEMS.get(scstr);

      if (!systemComponentTypes) {
        return;
      }

      // Array of entities that when TRUE are excluded from the system update
      const excludedEntities: Array<boolean> = new Array(
        this.#entityList.length
      ).fill(false);

      // Iterate each component type required by the system
      for (let i = 0; i < systemComponentTypes.length; i++) {
        const componentType = systemComponentTypes[i];
        const componentTypeRow = this.#table.get(componentType);

        if (!componentTypeRow) {
          return;
        }

        // Iterate each component instance of the component type
        for (let entity = 0; entity < componentTypeRow.length; entity++) {
          if (excludedEntities[entity]) {
            continue;
          }

          // If the component instance is null, then the entity does not have the component
          const component = componentTypeRow[entity];
          if (!component) {
            excludedEntities[entity] = true;
          }
        }
      }

      //const args: Array<Component[]> = [];
      for (let entity = 0; entity < excludedEntities.length; entity++) {
        if (excludedEntities[entity]) {
          continue;
        }

        const localArgs: Array<Component> = [];
        for (let i = 0; i < systemComponentTypes.length; i++) {
          const componentType = systemComponentTypes[i];
          const componentTypeRow = this.#table.get(componentType);
          const component = componentTypeRow?.[entity];

          if (!component) {
            return;
          }
          localArgs.push(component);
        }

        system.update(entity, ...localArgs);
      }

      // for (let i = 0; i < args.length; i++) {
      //   system.update(...args[i]);
      // }
    });
  }
}

////// Main

const world = new World();

const test = new TestComponent();
test.msg = 'hellooooo';

const entity = world.createEntity();

world.addEntityComponent(entity, test);
world.addEntityComponent(entity, new ZachComponent());

world.registerSystem(new TestSystem());

world.testStart();
