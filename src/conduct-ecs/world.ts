import raf from "raf";

import { STATE_ID, StateKey } from "@/conduct-ecs/state";
import {
  RegisteredSystem,
  System,
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
  ComponentAdder,
  ComponentConstructor,
  ComponentDataConstructor,
} from "./component";
import { Entity } from "./entity";
import { ConductEventsRegistry, EventEmitter, EventReceiver } from "./event";
import { createSignature, signatureEquals } from "./signature";

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
  private entityList = new Int32Array(80_000);

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

  private states: unknown[] = [];

  private tick = 0;
  #previousTimestamp = 0;
  #gameStarted = false;

  constructor(private config: WorldConfig) {
    config.events.subscribe(
      ConductEventsRegistry.EntityDestroyed,
      ({ data }) => {
        this.destroyEntity(data);
      }
    );
  }

  get gameHostType() {
    return this.config.gameHost;
  }

  /**
   * Spawn a new Entity in this World.
   */
  addEntity(): ComponentAdder {
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
      event: ConductEventsRegistry.EntityCreated,
      data: entity,
    });

    return new ComponentAdder(entity, this);
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
    data: ComponentDataConstructor<T>
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
      event: ConductEventsRegistry.EntityCreated,
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
      const { queries } = (system as RegisteredSystem)[SYSTEM_SIGNATURE];
      queries.forEach((query) => (query.world = this));
      this.systems.push(system);
    }
    return this;
  }

  async registerSystemInit(
    system: SystemInit,
    runImmediate = false
  ): Promise<World> {
    if (runImmediate) {
      await system(this);
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

    const entity = this.addEntity();
    bundleInstance.build(entity.entity, this);
    return entity.entity;
  }

  registerState<T extends object>(state: StateKey<T>, obj: T): World {
    this.states[state[STATE_ID]] = obj;
    return this;
  }

  getState<T extends object>(state: StateKey<T>): T {
    return this.states[state[STATE_ID]] as T;
  }

  start(): void {
    this.#gameStarted = true;

    this.initSystems.forEach((init) => init(this));
    this.initSystems = [];

    raf(this.update.bind(this));
  }

  private update(timestamp: number): void {
    this.tick++;

    // const runs: number[] = [];
    // while (true) {
    //   if (runs.length >= 8_000) {
    //     runs.splice(0, 10);
    //     console.log(
    //       "AVG RUN TIME",
    //       runs.reduce((a, b) => a + b, 0) / runs.length
    //     );
    //     break;
    //   }
    //   runs.push(performance.now() - LAST_RUN_TIME);
    //   LAST_RUN_TIME = performance.now();
    //
    //   this.#handleEntityEvents();
    //
    //   this.#runUpdateSystems(timestamp);
    // }
    // console.log(
    //   this.tick,
    //   " | LAST RUN TIME DIFF",
    //   performance.now() - LAST_RUN_TIME
    // );
    LAST_RUN_TIME = performance.now();

    this.#handleEntityEvents();

    this.#runUpdateSystems(timestamp);

    // For now we bind the update to the next frame
    raf(this.update.bind(this));
  }

  #handleEntityEvents() {
    this.internalEntityEvents.forEach((modification, entity) => {
      const [action, components] = modification;

      if (action === EntityEventCreate) {
        this.#addOrUpdateArchetype(entity, components);
        this.entityList[entity] = EntityStateActive;
        this.config.events.publish({
          event: ConductEventsRegistry.EntityCreated,
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
        components.map((c) => [c]),
        [entity]
      );
      const len = this.archetypes.push(archetype);
      this.mapEntityToArchetype[entity] = len - 1;

      // Temporary - update all the queries
      this.systems.forEach((system) => {
        (system as RegisteredSystem)[SYSTEM_SIGNATURE].queries.forEach(
          (query) => query.handleNewArchetype(archetype)
        );
      });
    }
  }

  #runUpdateSystems(timestamp: number) {
    const secondsPassed = (timestamp - this.#previousTimestamp) / 1000;
    this.#previousTimestamp = timestamp;

    // Update all systems
    for (let s = 0; s < this.systems.length; s++) {
      const system = this.systems[s] as RegisteredSystem;
      const { queries } = system[SYSTEM_SIGNATURE];
      //queries.forEach((query) => (query.archetypes = this.archetypes));
      system(...queries);
    }
  }
}
