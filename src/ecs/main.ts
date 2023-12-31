import 'reflect-metadata';

import { COMPONENT_TYPE, Component, ComponentConstructor } from './component';
import { Entity } from './entity';
import { SYSTEM_PARAMS, System, SystemConstructor } from './system';

type ComponentTable = Map<ComponentConstructor, Array<Component | null>>;

export class World {
  #entityList: Array<Entity> = [];
  #systems: Map<Function, System> = new Map();
  #componentTable: ComponentTable = new Map();

  CreateEntity(): Entity {
    const entity = this.#entityList.length;
    this.#entityList[entity] = entity;

    // Update the table to include the new entity
    this.#componentTable.forEach((componentList, componentType) => {
      this.#componentTable.set(componentType, [...componentList, null]);
    });

    return entity;
  }

  AddEntityComponent<T extends Component>(entity: Entity, component: T) {
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

  GetEntityComponent<TComponent extends ComponentConstructor>(
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

  RegisterSystem(system: System): World {
    this.#systems.set(system.constructor, system);
    return this;
  }

  // query<A extends ComponentConstructor, B extends ComponentConstructor>(
  //   a: A,
  //   b: B
  // ): [InstanceType<A>, InstanceType<B>][];

  // query<
  //   A extends ComponentConstructor,
  //   B extends ComponentConstructor,
  //   C extends ComponentConstructor,
  // >(
  //   a: A,
  //   b: B,
  //   c: C
  // ): [InstanceType<A>, InstanceType<B>, InstanceType<C>][];

  TestStart() {
    this.#systems.forEach((system, scstr) => {
      const systemComponentTypes = (system.constructor as SystemConstructor)[
        SYSTEM_PARAMS
      ];
      if (!systemComponentTypes) {
        return;
      }

      const componentsToQuery = systemComponentTypes.queryWith;

      // This is what we're trying to build up to
      const componentInstances: Array<[Entity, Component[]]> = [];

      // const results = this.query(ZComp, XComp, ZComp);
      // results.forEach(([z, x, z2]) => {

      // });

      for (let entity = 0; entity < this.#entityList.length; entity++) {
        const components: Array<Component> = [];

        // Check that the entity has all the components that are to be queried
        for (let i = 0; i < componentsToQuery.length; i++) {
          const component = this.GetEntityComponent(
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
            const component = this.GetEntityComponent(
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

class ZComp extends Component {
  name!: string;
}

class XComp extends Component {
  name!: string;
}
