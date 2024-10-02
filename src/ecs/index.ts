import 'reflect-metadata';

import { COMPONENT_TYPE, Component, ComponentConstructor } from './component';
import { Entity } from './entity';
import { SYSTEM_PARAMS, System, SystemConstructor, World as W } from './system';

type ComponentTable = Map<ComponentConstructor, Array<Component | null>>;

export class World implements W {
  #entityList: Array<Entity | null> = [];
  #systems: Map<SystemConstructor, System> = new Map();
  #componentTable: ComponentTable = new Map();

  CreateEntity(): Entity {
    let entity = 0;
    
    while (entity <= this.#entityList.length) {
      if (this.#entityList[entity] === null || this.#entityList[entity] === undefined) {
        break;
      }
      entity++;
    }

    this.#entityList[entity] = entity;

    this.#componentTable.forEach((componentList) => {
      componentList.push(null);
    });

    return entity;
  }

  DestroyEntity(entity: Entity): void {
    this.#componentTable.forEach((componentList) => {
      componentList[entity] = null;
    });

    this.#entityList[entity] = null;
  }

  /**
   * Assignes the `component` to the `entity`.
   * 
   * @example
   * 
   * world.AddEntityComponent(entity, component);
   */
  AddEntityComponent<T extends Component>(entity: Entity, component: T): void {
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

  /**
   * Retrieves the instance of the `component` assigned to the `entity`. If the `entity`
   * does *NOT* have a component of type `component` assigned to it, then `null` is returned.
   * 
   * @example
   * 
   * const c = world.GetEntityComponent(entity, SomeComponentType);
   */
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
    this.#systems.set(system.constructor as SystemConstructor, system);
    return this;
  }

  Query<A extends ComponentConstructor>(
    include: [A],
    exclude?: ComponentConstructor[]
  ): Array<[Entity, InstanceType<A>[]]>;
  Query<A extends ComponentConstructor, B extends ComponentConstructor>(
    include: [A, B],
    exclude?: ComponentConstructor[]
  ): Array<[Entity, [InstanceType<A>, InstanceType<B>]]>;
  Query<A extends ComponentConstructor, B extends ComponentConstructor, C extends ComponentConstructor>(
    include: [A, B, C],
    exclude?: ComponentConstructor[]
  ): Array<[Entity, [InstanceType<A>, InstanceType<B>, InstanceType<C>]]>
  Query<A extends ComponentConstructor, B extends ComponentConstructor, C extends ComponentConstructor>(
    include: [A] | [A, B] | [A, B, C],
    exclude: ComponentConstructor[] = [],
  ): Array<[Entity, [A] | [A, B] | [A, B, C]]> {
    // This is what we're trying to build up to
    const componentInstances: Array<[Entity, typeof include]> = [];

    for (let entity = 0; entity < this.#entityList.length; entity++) {
      // Flip to FALSE whenever a condition fails. This must be TRUE in order for this
      // entity's components to be added
      let querySuccess = true;

      const components = new Array(include.length) as typeof include;

      // Check that the entity has all the components that are to be queried
      for (let i = 0; i < include.length; i++) {
        const component = this.GetEntityComponent(
          entity,
          include[i]
        );
        if (!component) {
          // The component instance is null for this entity, so the entity does not have the component and should be excluded
          querySuccess = false;
          break;
        }

        // @todo ts-ignore may be unnavoidable
        // @ts-ignore
        components[i] = component;
      }

      if (querySuccess) {
        // All components were found for this entity, so now check if the entity has any of the components that are to be excluded
        for (let i = 0; i < exclude.length ?? 0; i++) {
          const component = this.GetEntityComponent(
            entity,
            exclude[i]
          );
          if (component) {
            // The instance is NOT null, so the entity has the component and should be excluded
            querySuccess = false;
            break;
          }
        }
      }

      if (querySuccess) {
        componentInstances.push([entity, components]);
      }
    }

    return componentInstances;
  }

  TestStart() {
    this.#systems.forEach((system, scstr) => {
      const systemComponentTypes = scstr[
        SYSTEM_PARAMS
      ];
      if (!systemComponentTypes) {
        return;
      }

      const results = this.Query((systemComponentTypes.queryWith as [ComponentConstructor]));
      for (let i = 0; i < results.length; i++) {
        const [entity, components] = results[i];
        system.Update({ entity, world: this }, ...components);
      }
    });
  }
}
