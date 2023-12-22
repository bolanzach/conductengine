import 'reflect-metadata';

import { COMPONENT_TYPE, Component, ComponentConstructor } from './component';
import { Entity } from './entity';
import { REGISTERED_SYSTEMS, System } from './system';

type ComponentTable = Map<ComponentConstructor, Array<Component | null>>;

export class World {
  #entityList: Array<Entity> = [];
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

      const componentsToQuery = systemComponentTypes.queryWith;

      // This is what we're trying to build up to
      const componentInstances: Array<[Entity, Component[]]> = [];

      for (let entity = 0; entity < this.#entityList.length; entity++) {
        const components: Array<Component> = [];

        // Check that the entity has all the components that are to be queried
        for (let i = 0; i < componentsToQuery.length; i++) {
          const component = this.getEntityComponent(
            entity,
            componentsToQuery[i]
          );
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
            const component = this.getEntityComponent(
              entity,
              systemComponentTypes.queryWithout[i]
            );
            if (component) {
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
        system.Update(entity, ...components)
      );
    });
  }
}
