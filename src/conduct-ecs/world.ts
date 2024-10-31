import raf from "raf";

import { STATE_ID, StateKey } from "@/conduct-ecs/state";
import {
  System,
  SYSTEM_PARAMS,
  SYSTEM_SIGNATURE,
  SystemInit,
} from "@/conduct-ecs/system";

import { Archetype, createArchetype, updateArchetype } from "./archetype";
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
  EVENT_COMPONENT_ADDED,
  EVENT_ENTITY_CREATED,
  EVENT_ENTITY_DESTROY,
  EVENT_ENTITY_SPAWNED,
  EventEmitter,
  EventReceiver,
} from "./event";
import {
  createSignature,
  signatureContains,
  signatureEquals,
} from "./signature";

const EntityStateInactive = 0;
const EntityStateDestroying = 1;
const EntityStateSpawning = 2;
const EntityStateActive = 3;

const EntityEventCreate = 1;
const EntityEventAddComponent = 2;
const EntityEventRemoveComponent = 3;
const EntityEventDestroy = 4;

export interface WorldConfig {
  gameHost: "client" | "server";
  events: EventEmitter & EventReceiver;
  fps?: number;
}

let LAST_RUN_TIME = performance.now();

export class World {
  // The index is the entity ID and the value is the entity state.
  private entityList = new Int32Array(10_000);

  // Buffer events for entities
  private internalEntityEvents = new Map<Entity, [number, Component[]]>();

  // All archetypes
  private archetypes: Archetype[] = [];

  // Maps entity (index) to archetype (value)
  private mapEntityToArchetype: number[] = [];

  // Registered systems
  private systems: System[] = [];

  // Systems that run a single time when the game starts
  private initSystems: SystemInit[] = [];

  // Registered bundles
  private bundles = new Map<string, Bundle>();

  private states = new Map<number, any>();

  private tick = 0;
  #previousTimestamp = 0;
  #gameStarted = false;

  constructor(private config: WorldConfig) {
    config.events.subscribe(({ event, data }) => {
      if (event === EVENT_ENTITY_DESTROY) {
        this.destroyEntity(data);
      }
    });
  }

  get gameHostType() {
    return this.config.gameHost;
  }

  /**
   * Spawn a new Entity in this World.
   */
  createEntity(): Entity {
    let entity = 0;

    while (entity < this.entityList.length) {
      if (this.entityList[entity] === EntityStateInactive) {
        break;
      }
      entity++;
    }

    this.entityList[entity] = EntityStateSpawning;
    this.internalEntityEvents.set(entity, [EntityEventCreate, []]);

    this.config.events.publish({
      event: EVENT_ENTITY_CREATED,
      data: entity,
    });

    return entity;
  }

  destroyEntity(entity: Entity): void {
    if (this.entityList[entity]) {
      this.internalEntityEvents.set(entity, [EntityEventDestroy, []]);
      this.entityList[entity] = EntityStateDestroying;
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
    if (this.entityList[entity] <= EntityStateDestroying) {
      console.error("Cannot add component to inactive entity");
      return this;
    }

    if (componentType[COMPONENT_ID] === undefined) {
      return this;
    }

    const componentInstance = component(componentType, data);
    const [evt, modified] = this.internalEntityEvents.get(entity) || [
      EntityEventAddComponent,
      [],
    ];

    this.internalEntityEvents.set(entity, [
      Math.min(evt, EntityEventAddComponent),
      [...modified, componentInstance],
    ]);

    this.config.events.publish({
      event: EVENT_COMPONENT_ADDED,
      data: { entity, component: componentInstance },
    });

    return this;
  }

  getAllComponentsForEntity(entity: Entity): Component[] {
    const components: Component[] = [];

    if (this.entityList[entity] <= EntityStateDestroying) {
      return components;
    }

    const archetype = this.archetypes[this.mapEntityToArchetype[entity]];

    archetype.components.forEach((componentList) => {
      components.push(componentList[entity]);
    });
    return components;
  }

  /**
   * Register a System to process Entities on each frame.
   */
  registerSystem(system: System): World {
    const found = this.systems.find((s) => s === system);
    if (!found) {
      this.systems.push(system);
    }
    return this;
  }

  registerSystemInit(system: SystemInit, runImmediate = false): World {
    if (runImmediate) {
      system(this);
      return this;
    }
    if (this.#gameStarted) {
      console.error("Cannot register a SystemInit after the game has started");
      return this;
    }

    this.initSystems.push(system);
    return this;
  }

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

  registerState<T extends object>(state: StateKey<T>, obj: T): World {
    this.states.set(state[STATE_ID], obj);
    return this;
  }

  getState<T extends object>(state: StateKey<T>): T {
    return this.states.get(state[STATE_ID]);
  }

  start(): void {
    this.#gameStarted = true;

    this.initSystems.forEach((init) => init(this));
    this.initSystems = [];

    raf(this.update.bind(this));
  }

  private update(timestamp: number): void {
    this.tick++;

    console.log(
      this.tick,
      " | LAST RUN TIME DIFF MS",
      performance.now() - LAST_RUN_TIME
    );
    LAST_RUN_TIME = performance.now();

    this.#handleEntityEvents();

    this.#runUpdateSystems(timestamp);

    raf(this.update.bind(this));
  }

  #handleEntityEvents() {
    this.internalEntityEvents.forEach((modification, entity) => {
      const [action, components] = modification;

      if (action === EntityEventCreate) {
        this.#addOrUpdateArchetype(entity, components);
        this.entityList[entity] = EntityStateActive;
        this.config.events.publish({
          event: EVENT_ENTITY_SPAWNED,
          data: entity,
        });
      } else if (action === EntityEventAddComponent) {
        const archetype = this.archetypes[this.mapEntityToArchetype[entity]];
        if (!archetype) {
          // @todo
          return;
        }

        // Remove the entity from the old archetype
        const entityIdx = archetype.entities.findIndex((e) => e === entity);
        archetype.entities = archetype.entities.filter((e) => e !== entity);

        // Remove the components from the old archetype
        const existingComponents: Component[] = [];
        archetype.components.forEach((componentList) => {
          existingComponents.push(...componentList.splice(entityIdx, 1));
        });

        existingComponents.push(...components);

        this.#addOrUpdateArchetype(entity, existingComponents);
      } else if (action === EntityEventRemoveComponent) {
        // @todo
      } else if (action === EntityEventDestroy) {
        // @todo
      }
    });

    this.internalEntityEvents.clear();
  }

  #addOrUpdateArchetype(entity: Entity, components: Component[]) {
    const entitySignature = createSignature(
      components.map((c) => c[COMPONENT_TYPE][COMPONENT_ID] as number)
    );
    const archetypeIdx = this.archetypes.findIndex((a) =>
      signatureEquals(a.signature, entitySignature)
    );

    if (archetypeIdx !== -1) {
      updateArchetype(this.archetypes[archetypeIdx], components, entity);
      this.mapEntityToArchetype[entity] = archetypeIdx;
    } else {
      const archetype = createArchetype(
        new Map(components.map((c) => [c[COMPONENT_TYPE], [c]])),
        [entity]
      );
      const len = this.archetypes.push(archetype);
      this.mapEntityToArchetype[entity] = len - 1;
    }
  }

  #runUpdateSystems(timestamp: number) {
    const secondsPassed = (timestamp - this.#previousTimestamp) / 1000;
    this.#previousTimestamp = timestamp;

    const systemQueryParams: [Entity, ...Component[]][] = [];
    // @ts-expect-error This is just creating an object
    systemQueryParams.world = this;
    // @ts-expect-error This is just creating an object
    systemQueryParams.time = {
      tick: this.tick,
      delta: secondsPassed,
      timestamp,
    };

    // Update all systems
    for (let s = 0; s < this.systems.length; s++) {
      const system = this.systems[s];

      // @ts-expect-error The system has a Definition
      const systemComponentTypes = system[SYSTEM_PARAMS];
      // @ts-expect-error The system has a Signature
      const systemSignature = system[SYSTEM_SIGNATURE];

      // Find all archetypes that match the system signature
      for (let a = 0; a < this.archetypes.length; a++) {
        const archetype = this.archetypes[a];

        if (
          !signatureContains(systemSignature.queryWith, archetype.signature)
        ) {
          // Signature does not match, skip this archetype
          continue;
        }

        const archetypeComponents = archetype.components;
        const archetypeEntities = archetype.entities;
        systemQueryParams.filter(() => false);

        // Each entity in the archetype will be processed
        for (let e = 0; e < archetypeEntities.length; e++) {
          const componentParams: Component[] = [];

          // Collect the components based on the system's requirements
          for (let i = 0; i < systemComponentTypes.queryWith.length; i++) {
            const systemComponentType = systemComponentTypes.queryWith[i];
            const components = archetypeComponents.get(
              systemComponentType
            ) as Component[];
            componentParams.push(components[e]);
          }

          systemQueryParams.push([archetypeEntities[e], ...componentParams]);
        }

        // @ts-expect-error This is cheating
        system(systemQueryParams);
      }
    }
  }
}
