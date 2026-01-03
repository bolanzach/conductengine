export type ConductEntity = number;

export type ConductComponent = object;

export type ConductSystem = (query: Query<QueryElement[]>) => void;

export const ComponentId = Symbol("ComponentId");

/**
 * A bit mask signature for a set of components.
 */
export type Signature = number[];

type ComponentConstructor = {
  /**
   * Unique component ID assigned at runtime.
   */
  [ComponentId]?: number;
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
// @ts-ignore - Need Generic T
export interface Optional<T extends ConductComponent[]> extends QueryOperator {
  readonly [OPERATOR_TYPE]: "Optional";
}

export type QueryElement = ConductComponent | QueryOperator;

type SystemArgs<T extends object[]> = [ConductEntity, ...T];

/**
 * Extract only data components from a tuple that may contain operators.
 */
type FilterDataComponents<T extends QueryElement[]> = T extends [
  infer Element,
  ...infer Rest,
]
  ? Element extends QueryOperator
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

// Entity location tracking: entityId -> { archetype, row }
interface EntityLocation {
  archetype: Archetype;
  row: number;
}

const ARCHETYPE_INITIAL_CAPACITY = 64;
const ARCHETYPE_GROWTH_FACTOR = 2;
const BIT_CHUNK_SIZE = 32;

let nextComponentId = 0;
let nextEntityId = 0;

const archetypes: Archetype[] = [];
const archetypesBySignature = new Map<string, Archetype>();

// Generation counter for cache invalidation - increments when archetypes are added
let archetypeGeneration = 0;

const entityLocations = new Map<number, EntityLocation>();

// Recycled entity IDs
const freeEntityIds: number[] = [];

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
  const componentIds = components.map((Component) => {
    let componentId = Component[ComponentId];
    if (componentId === undefined) {
      componentId = nextComponentId++;
      Component[ComponentId] = componentId;
    }
    return componentId;
  });
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

export function spawnEntity(): number {
  if (freeEntityIds.length > 0) {
    return freeEntityIds.pop()!;
  }
  return nextEntityId++;
}

function createArchetype(signature: Signature): Archetype {
  const archetype: Archetype = {
    signature,
    columns: {},
    entities: new Array(ARCHETYPE_INITIAL_CAPACITY).fill(0), // Fill to make PACKED
    count: 0,
    capacity: ARCHETYPE_INITIAL_CAPACITY,
  };

  archetypes.push(archetype);
  archetypesBySignature.set(signatureToKey(signature), archetype);

  // Invalidate all query caches by incrementing the generation
  archetypeGeneration++;

  return archetype;
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

export function addComponent(
  entityId: number,
  component: ComponentConstructor
) {
  // Get or assign ComponentId using the Symbol
  let componentId = component[ComponentId];
  if (componentId === undefined) {
    componentId = nextComponentId++;
    component[ComponentId] = componentId;
  }
  const existingLocation = entityLocations.get(entityId);

  // Build the new signature: existing components + new component
  const newSignature = existingLocation
    ? signatureAdd(existingLocation.archetype.signature, componentId)
    : createSignature([componentId]);

  // Get or create target archetype
  const newKey = signatureToKey(newSignature);
  let dstArch = archetypesBySignature.get(newKey);
  if (!dstArch) {
    dstArch = createArchetype(newSignature);
  }

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
    const { archetype: srcArch, row: srcRow } = existingLocation;

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

      entityLocations.set(lastEntityId, { archetype: srcArch, row: srcRow });
    }
    srcArch.count--;
  }

  // Add the new component's data
  const instance = new component();
  const componentName = component.name;
  for (const key of Object.keys(instance)) {
    const columnKey = `${componentName}.${key}`;
    if (!dstArch.columns[columnKey]) {
      dstArch.columns[columnKey] = new Array(dstArch.capacity).fill(0);
    }
    // @ts-ignore
    dstArch.columns[columnKey][dstRow] = instance[key];
  }

  // Update entity location
  entityLocations.set(entityId, { archetype: dstArch, row: dstRow });
}

// Remove a component from an entity (moves entity to new archetype)
// @ts-ignore - Reserved for future use
function removeComponent(
  entityId: number,
  component: ComponentConstructor
): boolean {
  const location = entityLocations.get(entityId);
  if (!location) return false;

  const { archetype: srcArch, row: srcRow } = location;
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
  let dstArch = archetypesBySignature.get(newKey);
  if (!dstArch) {
    dstArch = createArchetype(newSignature);
  }

  // Grow destination if needed
  if (dstArch.count >= dstArch.capacity) {
    growArchetype(dstArch);
  }

  // Add entity to destination archetype
  const dstRow = dstArch.count;
  dstArch.entities[dstRow] = entityId;
  dstArch.count++;

  // Copy component data (except the removed component)
  const componentPrefix = component.name + ".";
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

    entityLocations.set(lastEntityId, { archetype: srcArch, row: srcRow });
  }

  srcArch.count--;

  // Update entity location to new archetype
  entityLocations.set(entityId, { archetype: dstArch, row: dstRow });

  return true;
}

function deleteEntity(entityId: number): boolean {
  const location = entityLocations.get(entityId);
  if (!location) return false;

  const { archetype, row } = location;
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

    // Update swapped entity's location
    entityLocations.set(lastEntityId, { archetype, row });
  }

  archetype.count--;

  // Clean up deleted entity
  entityLocations.delete(entityId);
  freeEntityIds.push(entityId);

  return true;
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
 * Register a System function so that it can be executed.
 */
export function registerSystem(system: ConductSystem): () => void {
  // Type erasure - the system gets compiled to a function without arguments
  return (system as unknown as () => void);
}
