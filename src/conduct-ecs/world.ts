import raf from "raf";

import Archetype, { signatureCompare } from "./archetype";
import { Bundle, BundleConstructor } from "./bundle";
import {
  Component,
  component,
  COMPONENT_ID,
  COMPONENT_TYPE,
  ComponentConstructor,
  DeleteFunctions,
} from "./component";
import { NETWORK_ID } from "./components/network";
import { Entity } from "./entity";
import {
  System,
  SYSTEM_PARAMS,
  SYSTEM_SIGNATURE,
  SystemConstructor,
  SystemInit,
} from "./system";

type ComponentTable = Map<ComponentConstructor, (Component | null)[]>;

const EntityStateInactive = 0;
const EntityStateSpawning = 1;
const EntityStateActive = 2;

const EntityEventAddComponent = 1;
const EntityEventRemoveComponent = 2;
const EntityEventDestroy = 3;

export interface WorldConfig {
  gameHost: "client" | "server";
  fps?: number;
}

export class World {
  // The index is the entity ID and the value is the entity state.
  private entityList = new Int32Array(1000);
  private queryEntityLength = 0;

  // Registered systems
  private systems = new Map<SystemConstructor, System>();
  // Systems that run once, when the game starts
  private initSystems: SystemInit[] = [];

  private archetypes: Archetype[] = [];

  private modifiedEntities = new Map<Entity, [number, Component[]]>();

  // Lookup of component to entity
  private componentTable: ComponentTable = new Map();

  // Registered bundles
  private bundles = new Map<string, Bundle>();

  private tick = 0;
  #previousTimestamp = 0;
  #gameStarted = false;

  constructor(private config: WorldConfig) {}

  get gameHostType() {
    return this.config.gameHost;
  }

  /**
   * Spawn a new Entity in this World.
   */
  createEntity(): Entity {
    let entity = 0;

    while (entity <= this.entityList.length) {
      if (this.entityList[entity] === 0) {
        break;
      }
      entity++;
    }

    this.entityList[entity] = EntityStateSpawning;
    this.modifiedEntities.set(entity, [EntityEventAddComponent, []]);

    return entity;
  }

  destroyEntity(entity: Entity): void {
    if (this.entityList[entity]) {
      this.modifiedEntities.set(entity, [EntityEventDestroy, []]);
      this.entityList[entity] = EntityStateInactive;
    }
  }

  /**
   * Assigns the `component` to the `entity`.
   *
   * @example
   *
   * world.AddEntityComponent(123, Component, { key: 'value' });
   */
  addComponentToEntity<T extends ComponentConstructor>(
    entity: Entity,
    componentType: T,
    data: DeleteFunctions<Omit<InstanceType<T>, typeof NETWORK_ID>>
  ): World {
    if (!this.entityList[entity]) {
      console.error("Cannot add component to inactive entity");
      return this;
    }

    const componentInstance = component(componentType, data);
    const [_, modified] = this.modifiedEntities.get(entity) ?? [];

    this.modifiedEntities.set(entity, [
      EntityEventAddComponent,
      [...(modified || []), componentInstance],
    ]);

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
    const componentList = this.componentTable.get(component);

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
    this.componentTable.forEach((componentList) => {
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
    this.systems.set(system.constructor as SystemConstructor, system);
    return this;
  }

  /**
   * Register a System to run once.
   */
  registerSystemInit(system: SystemInit, runImmediate = false): World {
    if (runImmediate) {
      system.init(this);
      return this;
    }

    if (this.#gameStarted) {
      console.error("Cannot register a SystemInit after the game has started");
      return this;
    }
    this.initSystems.push(system);
    return this;
  }

  /**
   * Might change this idk but easy for now
   */
  registerBundle(bundle: Bundle): World {
    this.bundles.set(bundle.constructor.name, bundle);
    return this;
  }

  spawnBundle(bundle: BundleConstructor | string): Entity {
    const key = typeof bundle === "string" ? bundle : bundle.name;
    const bundleInstance = this.bundles.get(key);
    if (!bundleInstance) {
      console.error(`Bundle ${key} not found`);
      return Infinity;
    }

    const entity = this.createEntity();
    return bundleInstance.build(entity, this);
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

    for (let entity = 0; entity < this.queryEntityLength; entity++) {
      // Flip to FALSE whenever a condition fails. This must be TRUE in order for this
      // entity's components to be added
      let querySuccess = true;

      // Check that the entity is active
      if (this.entityList[entity] === EntityStateInactive) {
        querySuccess = false;
        continue;
      }

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

    this.initSystems.forEach((initSystem) => initSystem.init(this));
    this.initSystems = [];

    raf(this.update.bind(this));
  }

  private update(timestamp: number): void {
    this.tick++;

    this.modifiedEntities.forEach((modification, entity) => {
      const [action, components] = modification;

      if (action === EntityEventAddComponent) {
        // @todo fix this
        const entitySignature = components
          .map((c) => c[COMPONENT_TYPE][COMPONENT_ID])
          .filter((id) => id !== undefined)
          .sort();
        if (!entitySignature.length) {
          return;
        }

        // @todo this can be optimized
        const archetype = this.archetypes.find((a) => {
          return entitySignature.every((id) => a.signature.includes(id));
        });

        if (archetype) {
          archetype.entities.push(entity);
          components.forEach((component, i) => {
            archetype.components
              .get(components[i][COMPONENT_TYPE])
              ?.push(component);
          });
        } else {
          const newArchetype: Archetype = {
            signature: entitySignature as number[],
            components: new Map(
              components.map((c) => [c[COMPONENT_TYPE], [c]])
            ),
            entities: [entity],
          };
          this.archetypes.push(newArchetype);
        }
      } else if (action === 3) {
        //
      }
    });

    this.modifiedEntities.clear();

    this.runUpdateSystems(timestamp);

    raf(this.update.bind(this));
  }

  private runUpdateSystems(timestamp: number) {
    const secondsPassed = (timestamp - this.#previousTimestamp) / 1000;
    this.#previousTimestamp = timestamp;

    const time = {
      tick: this.tick,
      delta: secondsPassed,
      timestamp,
    };

    // Update all systems
    this.systems.forEach((system, systemType) => {
      const systemComponentTypes = systemType[SYSTEM_PARAMS];
      const systemSignature = systemType[SYSTEM_SIGNATURE];

      // Find all archetypes that match the system signature
      for (let i = 0; i < this.archetypes.length; i++) {
        const archetype = this.archetypes[i];

        if (!signatureCompare(systemSignature.queryWith, archetype.signature)) {
          // Signature does not match, skip this archetype
          continue;
        }

        const archetypeComponents = archetype.components;
        const archetypeEntities = archetype.entities;

        // Each entity in the archetype will be processed
        for (let e = 0; e < archetypeEntities.length; e++) {
          const componentParams: Component[] = [];

          // Collect the components based on the system's requirements
          for (let c = 0; c < systemComponentTypes.queryWith.length; c++) {
            const systemComponentType = systemComponentTypes.queryWith[c];
            const components = archetypeComponents.get(
              systemComponentType
            ) as Component[];
            componentParams.push(components[e]);
          }

          // Update the system with the queried params
          system.update(
            {
              entity: archetypeEntities[e],
              world: this,
              time,
            },
            ...componentParams
          );
        }
      }
    });
  }
}
