import raf from 'raf';

import { BuildBundleData, Bundle, BundleConstructor } from './bundle';
import { Component, COMPONENT_TYPE, ComponentConstructor } from './component';
import { Entity } from './entity';
import { System, SYSTEM_PARAMS, SystemConstructor, SystemInit } from './system';

type ComponentTable = Map<ComponentConstructor, (Component | null)[]>;

export interface WorldConfig {
  gameHost: 'client' | 'server';
  setup: (w: World) => void;
  fps?: number;
}

export class World {
  #entityList: (Entity | null)[] = [];
  #systems = new Map<SystemConstructor, System>();
  #componentTable: ComponentTable = new Map();
  #initSystems: SystemInit[] = [];
  #bundles = new Map<string, Bundle>();

  #gameHost: 'client' | 'server';
  #fps: number;
  #previousTimestamp = 0;

  #gameStarted = false;

  constructor(private config: WorldConfig) {
    this.#gameHost = config.gameHost;
    this.#fps = config.fps || 1;
    this.config.setup(this);
  }

  /**
   * Spawn a new Entity in this World.
   */
  createEntity(): Entity {
    let entity = 0;

    while (entity <= this.#entityList.length) {
      if (
        this.#entityList[entity] === null ||
        this.#entityList[entity] === undefined
      ) {
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

  destroyEntity(entity: Entity): void {
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
  addEntityComponent<T extends Component>(entity: Entity, component: T): World {
    if (!this.#componentTable.has(component[COMPONENT_TYPE])) {
      this.#componentTable.set(
        component[COMPONENT_TYPE],
        new Array(this.#entityList.length).fill(null)
      );
    }

    const componentList = this.#componentTable.get(component[COMPONENT_TYPE]);
    if (!componentList) {
      return this;
    }

    componentList[entity] = component;

    return this;
  }

  /**
   * Retrieves the instance of the `component` assigned to the `entity`. If the `entity`
   * does *NOT* have a component of type `component` assigned to it, then `null` is returned.
   *
   * @example
   *
   * const c = world.GetEntityComponent(entity, SomeComponentType);
   */
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

  getAllComponentsForEntity(entity: Entity): Component[] {
    const components: Component[] = [];
    this.#componentTable.forEach((componentList) => {
      const component = componentList[entity];
      if (component) {
        components.push(component);
      }
    });
    return components;
  }

  /**
   * Register a System to process Entities on each frame.
   */
  registerSystem(system: System): World {
    this.#systems.set(system.constructor as SystemConstructor, system);
    return this;
  }

  /**
   * Register a System to run once at the start of the game.
   */
  registerSystemInit(system: SystemInit): World {
    if (this.#gameStarted) {
      console.error('Cannot register a SystemInit after the game has started');
    }
    this.#initSystems.push(system);
    return this;
  }

  /**
   * Might change this idk but easy for now
   */
  registerBundle(bundle: Bundle): World {
    this.#bundles.set(bundle.constructor.name, bundle);
    return this;
  }

  buildBundle(
    bundle: BundleConstructor | string,
    data: BuildBundleData = {}
  ): Entity {
    const key = typeof bundle === 'string' ? bundle : bundle.name;
    const bundleInstance = this.#bundles.get(key);
    if (!bundleInstance) {
      console.error(`Bundle ${key} not found`);
      return Infinity;
    }

    return bundleInstance.build(this, data);
  }

  Query<A extends ComponentConstructor>(
    include: [A],
    exclude?: ComponentConstructor[]
  ): [Entity, InstanceType<A>[]][];
  Query<A extends ComponentConstructor, B extends ComponentConstructor>(
    include: [A, B],
    exclude?: ComponentConstructor[]
  ): [Entity, [InstanceType<A>, InstanceType<B>]][];
  Query<
    A extends ComponentConstructor,
    B extends ComponentConstructor,
    C extends ComponentConstructor,
  >(
    include: [A, B, C],
    exclude?: ComponentConstructor[]
  ): [Entity, [InstanceType<A>, InstanceType<B>, InstanceType<C>]][];
  Query<
    A extends ComponentConstructor,
    B extends ComponentConstructor,
    C extends ComponentConstructor,
  >(
    include: [A] | [A, B] | [A, B, C],
    exclude: ComponentConstructor[] = []
  ): [Entity, [A] | [A, B] | [A, B, C]][] {
    // This is what we're trying to build up to
    const componentInstances: [Entity, typeof include][] = [];

    for (let entity = 0; entity < this.#entityList.length; entity++) {
      // Flip to FALSE whenever a condition fails. This must be TRUE in order for this
      // entity's components to be added
      let querySuccess = true;

      const components = new Array(include.length) as typeof include;

      // Check that the entity has all the components that are to be queried
      for (let i = 0; i < include.length; i++) {
        const component = this.getEntityComponent(entity, include[i]);
        if (!component) {
          // The component instance is null for this entity, so the entity does not have the component and should be excluded
          querySuccess = false;
          break;
        }

        // @ts-expect-error we know what we're doing here
        components[i] = component;
      }

      if (querySuccess) {
        // All components were found for this entity, so now check if the entity has any of the components that are to be excluded
        for (let i = 0; i < exclude.length; i++) {
          const component = this.getEntityComponent(entity, exclude[i]);
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

  start(): void {
    this.#gameStarted = true;

    this.#initSystems.forEach((initSystem) => initSystem.init(this));

    raf(this.update.bind(this));
  }

  private update(timestamp: number): void {
    this.#systems.forEach((system, scstr) => {
      const systemComponentTypes = scstr[SYSTEM_PARAMS];
      if (!systemComponentTypes) {
        return;
      }

      const secondsPassed = (timestamp - this.#previousTimestamp) / 1000;
      this.#previousTimestamp = timestamp;

      //const fps = Math.round(1 / secondsPassed);

      const results = this.Query(
        systemComponentTypes.queryWith as [ComponentConstructor]
      );
      for (let i = 0; i < results.length; i++) {
        const [entity, components] = results[i];
        system.update(
          {
            entity,
            world: this,
            time: {
              delta: secondsPassed,
              timestamp,
            },
          },
          ...components
        );
      }
    });

    raf(this.update.bind(this));
  }
}
