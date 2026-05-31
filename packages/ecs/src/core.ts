export type ConductEntity = number;

export type ConductComponent = object;

export type ConductSystem = (query: Query<QueryElement[]>) => void;

export type ConductBundle = [component: ComponentConstructor, data?: Record<string, any>][];

export const ComponentId = Symbol("ComponentId");
const ComponentFields = Symbol("ComponentFields");
const ComponentColumnKeys = Symbol("ComponentColumnKeys");

/**
 * A bit mask signature for a set of components.
 */
export type Signature = number[];

export type ComponentConstructor = {
  /**
   * Unique component ID assigned at runtime.
   */
  [ComponentId]?: number;
  /**
   * Cached field names discovered from prototype instance.
   */
  [ComponentFields]?: string[];
  /**
   * Cached column keys (`${componentId}.${field}`) for fast archetype access.
   */
  [ComponentColumnKeys]?: string[];
} & (new () => ConductComponent);

// Marker for operator type identification at runtime
const OPERATOR_TYPE = Symbol("OPERATOR_TYPE");

/**
 * Base interface for query operators.
 */
interface QueryOperator {
  readonly [OPERATOR_TYPE]: string;
}

/**
 * Exclude entities that have any of the specified components.
 *
 * @example
 * // Query entities with PersonComponent but NOT DeadComponent
 * Query<[PersonComponent, Not<[DeadComponent]>]>
 */
// @ts-ignore - Need Generic T
export interface Not<T extends ConductComponent[]> extends QueryOperator {
  readonly [OPERATOR_TYPE]: "Not";
}

/**
 * Include a component optionally - the component will be undefined if not present.
 *
 * @example
 * Query<[PlayerComponent, Optional<[DebugComponent]>]>
 */
export interface Optional<T extends ConductComponent[]> extends QueryOperator {
  readonly [OPERATOR_TYPE]: "Optional";
  readonly __phantom?: T;
}

export type QueryElement = ConductComponent | QueryOperator;

type SystemArgs<T extends object[]> = [ConductEntity, ...T];

/**
 * Maps each component in a tuple to Component | undefined.
 */
type OptionalTuple<T extends ConductComponent[]> = {
  [K in keyof T]: T[K] | undefined;
};

/**
 * Extract only data components from a tuple that may contain operators.
 */
type FilterDataComponents<T extends QueryElement[]> = T extends [
  infer Element,
  ...infer Rest,
]
  ? Element extends Optional<infer O>
    ? O extends ConductComponent[]
      ? Rest extends QueryElement[]
        ? [...OptionalTuple<O>, ...FilterDataComponents<Rest>]
        : OptionalTuple<O>
      : Rest extends QueryElement[]
        ? FilterDataComponents<Rest>
        : []
    : Element extends QueryOperator
      ? Rest extends QueryElement[]
        ? FilterDataComponents<Rest>
        : []
      : Element extends object
        ? Rest extends QueryElement[]
          ? [Element, ...FilterDataComponents<Rest>]
          : [Element]
        : []
  : [];

/**
 * A Query declares a set of Components to filter Entities by, and provides
 * an interface to iterate over those matching Entities and their Components.
 */
export interface Query<T extends QueryElement[]> {
  /**
   * Iterate over all matching entities and their components. The logic within
   * the `iteree` callback is executed for each matching entity. The first
   * argument is always the entity ID, followed by the requested components.
   *
   * @example
   * // Query for entities with Position and Velocity components
   * export default function MoveSystem(query: Query<[Position, Velocity]>) {
   *  query.iter(([entity, position, velocity]) => {
   *     position.x += velocity.vx;
   *     position.y += velocity.vy;
   *   });
   * }
   */
  iter: (iteree: (arg: SystemArgs<FilterDataComponents<T>>) => void) => void;
}

interface Archetype {
  signature: Signature;
  columns: Record<string, unknown[]>;
  entities: number[];
  count: number;
  capacity: number;
}

interface QueryGenerated {
  required: Signature;
  not: Signature;
  cache: Archetype[] | null;
  cacheGeneration: number;
}

/**
 * Tracks the location of an entity within an archetype
 */
interface EntityLocation {
  archetypeIndex: number;
  row: number;
}

type Command =
  | { type: 'addComponent'; entity: number; component: ComponentConstructor; data?: object | ((instance: object) => void) }
  | { type: 'removeComponent'; entity: number; component: ComponentConstructor }
  | { type: 'deleteEntity'; entity: number };

const ARCHETYPE_INITIAL_CAPACITY = 64;
const ARCHETYPE_GROWTH_FACTOR = 2;
const BIT_CHUNK_SIZE = 32;

let nextComponentId = 0;
let nextEntityId = 0;

const archetypes: Archetype[] = [];
const archetypesBySignature = new Map<string, number>();

/**
 * Generation counter for cache invalidation - increments when archetypes are added
 */
let archetypeGeneration = 0;

/**
 * Array mapping entity IDs to their location in an archetype
 */
const entityLocations: (EntityLocation | undefined)[] = [];

/**
 * Recycled entity IDs
 */
const freeEntityIds: number[] = [];

/**
 * A schedule determines when a system runs within the game loop.
 * - FixedUpdate: Runs at a fixed tick rate (0-N times per frame). deltaTime is always TICK_DT.
 * - Update: Runs once per frame at variable frame rate. deltaTime is the actual frame delta.
 */
export type Schedule = 0 | 1;

/** Fixed-rate simulation schedule. Runs 0-N times per frame at constant deltaTime. */
export const FixedUpdate: Schedule = 0;

/** Variable-rate rendering schedule. Runs once per frame. */
export const Update: Schedule = 1;

const fixedUpdateSystems: (() => void)[] = [];
const updateSystems: (() => void)[] = [];

const commandQueue: Command[] = [];

/**
 * Assigns and returns a unique component ID for the given component if
 * the component is not already registered.
 * @param component
 */
function registerComponentId(
  component: ComponentConstructor
): number {
  let componentId = component[ComponentId];

  if (componentId === undefined) {
    componentId = nextComponentId++;
    const instance = new component();
    const fields = Object.keys(instance);

    component[ComponentId] = componentId;
    component[ComponentFields] = fields;
    component[ComponentColumnKeys] = fields.map(key => `${componentId}.${key}`);
  }
  return componentId;
}

/**
 * Constructs a signature from a list of component ids.
 */
export function createSignature(components: number[]): Signature {
  if (!components.length) {
    return [];
  }

  const maxComponent = Math.max(...components);
  const signatureMask = new Array(
    Math.ceil((maxComponent + 1) / BIT_CHUNK_SIZE)
  ).fill(0);

  for (let i = 0; i < components.length; i++) {
    const component = components[i]!;
    const chunkIndex = Math.floor(component / BIT_CHUNK_SIZE);
    const bitIndex = component % BIT_CHUNK_SIZE;
    signatureMask[chunkIndex] |= 1 << bitIndex;
  }

  return signatureMask;
}

export function createSignatureFromComponents(
  components: ComponentConstructor[]
): Signature {
  const componentIds = components.map(registerComponentId);
  return createSignature(componentIds);
}

/**
 * Checks whether the `other` signature is contained within the `sig` signature.
 */
export function signatureContains(sig: Signature, other: Signature): boolean {
  for (let i = 0; i < other.length; i++) {
    const sigChunk = sig[i] ?? 0;
    if ((sigChunk & other[i]!) !== other[i]) {
      return false;
    }
  }
  return true;
}

/**
 * Checks whether the two signatures are equivalent.
 */
export function signatureEquals(sig: Signature, other: Signature): boolean {
  const maxLen = Math.max(sig.length, other.length);
  for (let i = 0; i < maxLen; i++) {
    if ((sig[i] ?? 0) !== (other[i] ?? 0)) {
      return false;
    }
  }
  return true;
}

/**
 * Checks whether two signatures have any overlapping bits.
 * Used for Not operator matching - returns true if any component is shared.
 */
export function signatureOverlaps(sig: Signature, other: Signature): boolean {
  const minLength = Math.min(sig.length, other.length);
  for (let i = 0; i < minLength; i++) {
    if ((sig[i]! & other[i]!) !== 0) {
      return true;
    }
  }
  return false;
}

/**
 * Adds a component bit to a signature.
 */
function signatureAdd(sig: Signature, componentId: number): Signature {
  const chunkIndex = Math.floor(componentId / BIT_CHUNK_SIZE);
  const bitIndex = componentId % BIT_CHUNK_SIZE;

  // Extend array if needed
  const result = sig.slice();
  while (result.length <= chunkIndex) {
    result.push(0);
  }
  result[chunkIndex]! |= 1 << bitIndex;

  return result;
}

/**
 * Removes component bits from a signature.
 */
function signatureRemove(sig: Signature, componentId: number): Signature {
  const chunkIndex = Math.floor(componentId / BIT_CHUNK_SIZE);
  const bitIndex = componentId % BIT_CHUNK_SIZE;

  const result = sig.slice();
  if (chunkIndex < result.length) {
    result[chunkIndex]! &= ~(1 << bitIndex);
  }

  // Trim trailing zeros
  while (result.length > 0 && result[result.length - 1] === 0) {
    result.pop();
  }

  return result;
}

/**
 * Checks if a signature is empty (all zeros).
 */
function signatureIsEmpty(sig: Signature): boolean {
  for (let i = 0; i < sig.length; i++) {
    if (sig[i] !== 0) return false;
  }
  return true;
}

/**
 * Converts a Signature to a string key for Map lookups.
 * TODO: Optimize by caching key in Signature object if this becomes a bottleneck.
 */
function signatureToKey(sig: Signature): string {
  return sig.join(",");
}

export function ConductSpawnEntity(): number {
  if (freeEntityIds.length > 0) {
    return freeEntityIds.pop()!;
  }
  return nextEntityId++;
}

export function ConductSpawnBundle(bundle: ConductBundle): ConductEntity {
  const entity = ConductSpawnEntity();

  // Merge duplicate component entries (later data fields overwrite earlier)
  const merged = new Map<ComponentConstructor, Record<string, any> | undefined>();
  for (let i = 0; i < bundle.length; i++) {
    const component = bundle[i]![0];
    const data = bundle[i]![1];
    const existing = merged.get(component);
    if (existing !== undefined) {
      if (data) Object.assign(existing, data);
    } else {
      merged.set(component, data ? { ...data } : undefined);
    }
  }

  for (const [component, data] of merged) {
    ConductAddComponent(entity, component, data);
  }
  return entity;
}

function createArchetype(signature: Signature): number {
  const archetype: Archetype = {
    signature,
    columns: {},
    entities: new Array(ARCHETYPE_INITIAL_CAPACITY).fill(0), // Fill to make PACKED
    count: 0,
    capacity: ARCHETYPE_INITIAL_CAPACITY,
  };

  const index = archetypes.length;
  archetypes.push(archetype);
  archetypesBySignature.set(signatureToKey(signature), index);

  // Invalidate all query caches by incrementing the generation
  archetypeGeneration++;

  return index;
}

function growArchetype(archetype: Archetype): void {
  const newCapacity = archetype.capacity * ARCHETYPE_GROWTH_FACTOR;

  // Grow entities array - fill to make packed array
  const newEntities = new Array(newCapacity).fill(0);
  for (let i = 0; i < archetype.count; i++) {
    newEntities[i] = archetype.entities[i];
  }
  archetype.entities = newEntities;

  // Grow all column arrays - fill to make packed array
  for (const columnKey in archetype.columns) {
    const oldColumn = archetype.columns[columnKey]!;
    const newColumn = new Array(newCapacity).fill(0);
    for (let i = 0; i < archetype.count; i++) {
      newColumn[i] = oldColumn[i];
    }
    archetype.columns[columnKey] = newColumn;
  }

  archetype.capacity = newCapacity;
}

function addComponent<T extends ComponentConstructor>(
  entityId: number,
  component: T,
  data?: Partial<InstanceType<T>> | ((instance: InstanceType<T>) => void),
) {
  const componentId = registerComponentId(component);

  // const componentId = component[ComponentId];
  // if (componentId === undefined) {
  //   // Component was never registered which means it's never used in a query/system.
  //   // While maybe this is unexpected behavior, we don't need to add a component
  //   // that is never queried for.
  //   return;
  // }

  const existingLocation = entityLocations[entityId];
  const componentSig = createSignature([componentId]);

  if (existingLocation) {
    // Check if entity already has this component
    const existingSig = archetypes[existingLocation.archetypeIndex]!.signature;
    if (signatureContains(existingSig, componentSig)) {
      // Component already exists — overwrite provided fields
      if (data) {
        const archetype = archetypes[existingLocation.archetypeIndex]!;
        const row = existingLocation.row;
        if (typeof data === "function") {
          // const instance = new component();
          // const fields = component[ComponentFields]!;
          // const columnKeys = component[ComponentColumnKeys]!;
          // for (let i = 0; i < fields.length; i++) {
          //   // @ts-ignore
          //   instance[fields[i]!] = archetype.columns[columnKeys[i]!]![row];
          // }
          // data(instance as InstanceType<T>);
          // for (let i = 0; i < columnKeys.length; i++) {
          //   // @ts-ignore
          //   archetype.columns[columnKeys[i]!]![row] = instance[fields[i]!];
          // }
        } else {
          for (const key in data) {
            const column = archetype.columns[`${componentId}.${key}`];
            if (column) {
              column[row] = data[key];
            }
          }
        }
      }
      return;
    }
  }

  // Build the new signature: existing components + new component
  const newSignature = existingLocation
    ? signatureAdd(archetypes[existingLocation.archetypeIndex]!.signature, componentId)
    : componentSig;

  // Get or create target archetype
  const newKey = signatureToKey(newSignature);
  let dstArchIdx = archetypesBySignature.get(newKey);
  if (dstArchIdx === undefined) {
    dstArchIdx = createArchetype(newSignature);
  }
  const dstArch = archetypes[dstArchIdx]!;

  // Grow destination if needed
  if (dstArch.count >= dstArch.capacity) {
    growArchetype(dstArch);
  }

  // Add entity to destination archetype
  const dstRow = dstArch.count;
  dstArch.entities[dstRow] = entityId;
  dstArch.count++;

  // If entity already existed, copy existing component data and remove from source
  if (existingLocation) {
    const srcArch = archetypes[existingLocation.archetypeIndex]!;
    const srcRow = existingLocation.row;

    // Copy all existing component data to new archetype
    for (const columnKey in srcArch.columns) {
      if (!dstArch.columns[columnKey]) {
        dstArch.columns[columnKey] = new Array(dstArch.capacity).fill(0);
      }
      dstArch.columns[columnKey][dstRow] = srcArch.columns[columnKey]![srcRow];
    }

    // Remove from source archetype using swap-remove
    const lastRow = srcArch.count - 1;
    if (srcRow !== lastRow) {
      const lastEntityId = srcArch.entities[lastRow]!;
      srcArch.entities[srcRow] = lastEntityId;

      for (const columnKey in srcArch.columns) {
        srcArch.columns[columnKey]![srcRow] =
          srcArch.columns[columnKey]![lastRow];
      }

      // archetypeIndex unchanged for the swapped entity, only row moves
      entityLocations[lastEntityId]!.row = srcRow;
    }
    srcArch.count--;
  }

  // Add the new component's data
  const instance = new component();

  if (data) {
    if (typeof data === "function") {
      data(instance as InstanceType<T>);
    } else {
      for (const key in data) {
        if (Object.hasOwn(instance, key)) {
          // @ts-ignore
          instance[key] = data[key];
        }
      }
    }
  }

  const fields = component[ComponentFields]!;
  const columnKeys = component[ComponentColumnKeys]!;
  // if (!fields) {
  //   fields = Object.keys(instance);
  //   component[ComponentFields] = fields;
  //   columnKeys = fields.map(key => `${componentId}.${key}`);
  //   component[ComponentColumnKeys] = columnKeys;
  // }

  for (let i = 0; i < columnKeys!.length; i++) {
    const columnKey = columnKeys![i];
    if (!dstArch.columns[columnKey!]) {
      dstArch.columns[columnKey!] = new Array(dstArch.capacity).fill(0);
    }
    // @ts-ignore
    dstArch.columns[columnKey][dstRow] = instance[fields[i]];
  }

  // Update entity location — mutate if exists, allocate on first add
  if (existingLocation) {
    existingLocation.archetypeIndex = dstArchIdx;
    existingLocation.row = dstRow;
  } else {
    entityLocations[entityId] = { archetypeIndex: dstArchIdx, row: dstRow };
  }
}

function removeComponent(
  entityId: number,
  component: ComponentConstructor
): boolean {
  const location = entityLocations[entityId];
  if (!location) return false;

  const srcArch = archetypes[location.archetypeIndex]!;
  const srcRow = location.row;
  const componentId = component[ComponentId];
  if (componentId === undefined) return false;

  // Check if entity actually has this component
  const componentSig = createSignature([componentId]);
  if (!signatureContains(srcArch.signature, componentSig)) return false;

  const newSignature = signatureRemove(srcArch.signature, componentId);

  // Edge case: removing last component deletes the entity
  if (signatureIsEmpty(newSignature)) {
    return deleteEntity(entityId);
  }

  // Get or create target archetype
  const newKey = signatureToKey(newSignature);
  let dstArchIdx = archetypesBySignature.get(newKey);
  if (dstArchIdx === undefined) {
    dstArchIdx = createArchetype(newSignature);
  }
  const dstArch = archetypes[dstArchIdx]!;

  // Grow destination if needed
  if (dstArch.count >= dstArch.capacity) {
    growArchetype(dstArch);
  }

  // Add entity to destination archetype
  const dstRow = dstArch.count;
  dstArch.entities[dstRow] = entityId;
  dstArch.count++;

  // Copy component data (except the removed component)
  const componentPrefix = `${componentId}.`;
  for (const columnKey in srcArch.columns) {
    if (columnKey.startsWith(componentPrefix)) continue;

    if (!dstArch.columns[columnKey]) {
      dstArch.columns[columnKey] = new Array(dstArch.capacity).fill(0);
    }
    dstArch.columns[columnKey][dstRow] = srcArch.columns[columnKey]![srcRow];
  }

  // Remove from source archetype using swap-remove
  const lastRow = srcArch.count - 1;
  if (srcRow !== lastRow) {
    const lastEntityId = srcArch.entities[lastRow]!;
    srcArch.entities[srcRow] = lastEntityId;

    for (const columnKey in srcArch.columns) {
      srcArch.columns[columnKey]![srcRow] = srcArch.columns[columnKey]![lastRow];
    }

    // archetypeIndex unchanged for the swapped entity, only row moves
    entityLocations[lastEntityId]!.row = srcRow;
  }

  srcArch.count--;

  // Update entity location to new archetype — mutate
  location.archetypeIndex = dstArchIdx;
  location.row = dstRow;

  return true;
}

/**
 * Read a component's data from an entity. Returns undefined if the entity
 * does not have the component.
 * This should ideally not be used inside hot code paths with systems. Instead,
 * prefer to use Query to access components.
 */
export function ConductGetComponent<T extends ComponentConstructor>(
  entity: ConductEntity,
  component: T
): Readonly<InstanceType<T>> | undefined {
  const location = entityLocations[entity];
  if (!location) return undefined;

  registerComponentId(component);
  const fields = component[ComponentFields]!;
  const columnKeys = component[ComponentColumnKeys]!;
  const archetype = archetypes[location.archetypeIndex]!;
  if (!archetype.columns[columnKeys[0]!]) return undefined;

  const row = location.row;
  const result: Record<string, unknown> = {};

  for (let i = 0; i < columnKeys.length; i++) {
    result[fields[i]!] = archetype.columns[columnKeys[i]!]![row];
  }

  return result as InstanceType<T>;
}


function deleteEntity(entityId: number): boolean {
  const location = entityLocations[entityId];
  if (!location) return false;

  const archetype = archetypes[location.archetypeIndex]!;
  const row = location.row;
  const lastRow = archetype.count - 1;

  if (row !== lastRow) {
    // Swap last entity into the deleted slot
    const lastEntityId = archetype.entities[lastRow]!;

    // Swap entity ID
    archetype.entities[row] = lastEntityId;

    // Swap all column data
    for (const columnKey in archetype.columns) {
      const column = archetype.columns[columnKey]!;
      column[row] = column[lastRow];
    }

    // archetypeIndex unchanged for the swapped entity, only row moves
    entityLocations[lastEntityId]!.row = row;
  }

  archetype.count--;

  // Clean up deleted entity
  entityLocations[entityId] = undefined;
  freeEntityIds.push(entityId);

  return true;
}

/**
 * Add or update a component on an entity.
 */
export function ConductAddComponent<T extends ComponentConstructor>(
  entity: ConductEntity,
  component: T,
  data?: Partial<InstanceType<T>> | ((instance: InstanceType<T>) => void),
): void {
  commandQueue.push({ type: 'addComponent', entity, component, data });
}

export function ConductRemoveComponent<T extends ComponentConstructor>(
  entity: ConductEntity,
  component: T
): void {
  commandQueue.push({ type: 'removeComponent', entity, component });
}

export function ConductDeleteEntity(entity: ConductEntity): void {
  commandQueue.push({ type: 'deleteEntity', entity });
}

function flushCommands(): void {
  for (let i = 0; i < commandQueue.length; i++) {
    const cmd = commandQueue[i]!;
    switch (cmd.type) {
      case 'addComponent':
        addComponent(
          cmd.entity,
          cmd.component,
          cmd.data,
        );
        break;
      case 'removeComponent':
        removeComponent(cmd.entity, cmd.component);
        break;
      case 'deleteEntity':
        deleteEntity(cmd.entity);
        break;
    }
  }
  commandQueue.length = 0;
}

export function query(q: QueryGenerated): Archetype[] {
  // Check if cache is valid
  if (q.cache && q.cacheGeneration === archetypeGeneration) {
    return q.cache;
  }

  const results: Archetype[] = [];
  for (let i = 0; i < archetypes.length; i++) {
    const arch = archetypes[i]!;
    // Must have all required components
    if (!signatureContains(arch.signature, q.required)) {
      continue;
    }
    // Must not have any excluded components (Not operator)
    if (q.not.length > 0 && signatureOverlaps(arch.signature, q.not)) {
      continue;
    }
    results.push(arch);
  }

  // Store cache and the generation it was built at
  q.cache = results;
  q.cacheGeneration = archetypeGeneration;

  return results;
}

/**
 * Register a System function so that it can be executed. Systems are
 * executed in the same order they are registered. Systems must be
 * registered before starting the Conduct ECS loop.
 *
 * @param schedule - FixedUpdate (deterministic tick rate) or Update (once per frame)
 * @param system - The system function to register
 */
export function ConductRegisterSystem(schedule: Schedule, system: ConductSystem): () => void {
  // Type erasure - the system gets compiled to a function without arguments
  const registeredSystem = (system as unknown as () => void);
  if (schedule === FixedUpdate) {
    fixedUpdateSystems.push(registeredSystem);
  } else {
    updateSystems.push(registeredSystem);
  }
  return registeredSystem;
}

/** Current delta time in seconds. Fixed during FixedUpdate, variable during Update. */
export let deltaTime = 0;

/** Time of the current frame in seconds */
export let time = 0;

/** Current simulation tick number, incremented each FixedUpdate step */
export let tick = 0;

let stopLoop: (() => void) | null = null;

/** Maximum number of fixed steps per frame to prevent spiral of death */
const MAX_FIXED_STEPS_PER_FRAME = 5;

/**
 * Start the main Conduct ECS loop, executing all registered systems.
 * Detects environment automatically: uses requestAnimationFrame in browsers,
 * setInterval in Node.js.
 *
 * @param tickRateHz - Simulation tick rate in Hz (e.g., 20 for 20 ticks/sec)
 */
export function ConductStart(tickRateHz: number): void {
  if (stopLoop !== null) return; // Already running

  const TICK_DT = 1 / tickRateHz;
  const TICK_MS = 1000 / tickRateHz;
  let accumulator = 0;

  const isBrowser = typeof requestAnimationFrame !== 'undefined';

  if (isBrowser) {
    let lastFrameTime = performance.now();
    let loopId: number;

    function frame(currentTime: number): void {
      const frameMs = currentTime - lastFrameTime;
      lastFrameTime = currentTime;
      time = currentTime / 1000;

      accumulator += frameMs;

      // Clamp to prevent spiral of death
      const maxAccumulator = TICK_MS * MAX_FIXED_STEPS_PER_FRAME;
      if (accumulator > maxAccumulator) {
        accumulator = maxAccumulator;
      }

      // FixedUpdate: 0-N times per frame at constant deltaTime
      while (accumulator >= TICK_MS) {
        deltaTime = TICK_DT;
        for (let i = 0; i < fixedUpdateSystems.length; i++) {
          fixedUpdateSystems[i]!();
        }
        flushCommands();
        tick++;
        accumulator -= TICK_MS;
      }

      // Update: once per frame at variable deltaTime
      deltaTime = frameMs / 1000;
      for (let i = 0; i < updateSystems.length; i++) {
        updateSystems[i]!();
      }
      flushCommands();

      loopId = requestAnimationFrame(frame);
    }

    loopId = requestAnimationFrame(frame);
    stopLoop = () => cancelAnimationFrame(loopId);
  } else {
    // Node.js: setInterval, FixedUpdate only
    const startTime = performance.now();

    const intervalId = setInterval(() => {
      const now = performance.now();
      time = (now - startTime) / 1000;
      deltaTime = TICK_DT;

      for (let i = 0; i < fixedUpdateSystems.length; i++) {
        fixedUpdateSystems[i]!();
      }
      flushCommands();
      tick++;
    }, TICK_MS);

    stopLoop = () => clearInterval(intervalId);
  }
}

/**
 * Stop the main Conduct ECS loop.
 */
export function ConductStop(): void {
  if (stopLoop) {
    stopLoop();
    stopLoop = null;
  }
}

/**
 * Run all FixedUpdate systems synchronously for benchmarking.
 */
export function ConductBenchmarkStart(iterations = 1_000): void {
  let count = 0;
  while (true) {
    for (let i = 0; i < fixedUpdateSystems.length; i++) {
      fixedUpdateSystems[i]!();
    }
    flushCommands();
    count++;
    if (count > iterations) {
      break;
    }
  }
}
