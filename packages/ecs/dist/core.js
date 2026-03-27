export const ComponentId = Symbol("ComponentId");
// Marker for operator type identification at runtime
const OPERATOR_TYPE = Symbol("OPERATOR_TYPE");
const ARCHETYPE_INITIAL_CAPACITY = 64;
const ARCHETYPE_GROWTH_FACTOR = 2;
const BIT_CHUNK_SIZE = 32;
let nextComponentId = 0;
let nextEntityId = 0;
const archetypes = [];
const archetypesBySignature = new Map();
// Generation counter for cache invalidation - increments when archetypes are added
let archetypeGeneration = 0;
const entityLocations = new Map();
// Recycled entity IDs
const freeEntityIds = [];
const allRegisteredSystems = new Set();
const commandQueue = [];
/**
 * Assigns and returns a unique component ID for the given component if
 * the component is not already registered.
 * @param component
 */
function registerComponentId(component) {
    let componentId = component[ComponentId];
    if (componentId === undefined) {
        componentId = nextComponentId++;
        component[ComponentId] = componentId;
    }
    return componentId;
}
/**
 * Constructs a signature from a list of component ids.
 */
export function createSignature(components) {
    if (!components.length) {
        return [];
    }
    const maxComponent = Math.max(...components);
    const signatureMask = new Array(Math.ceil((maxComponent + 1) / BIT_CHUNK_SIZE)).fill(0);
    for (let i = 0; i < components.length; i++) {
        const component = components[i];
        const chunkIndex = Math.floor(component / BIT_CHUNK_SIZE);
        const bitIndex = component % BIT_CHUNK_SIZE;
        signatureMask[chunkIndex] |= 1 << bitIndex;
    }
    return signatureMask;
}
export function createSignatureFromComponents(components) {
    const componentIds = components.map(registerComponentId);
    return createSignature(componentIds);
}
/**
 * Checks whether the `other` signature is contained within the `sig` signature.
 */
export function signatureContains(sig, other) {
    for (let i = 0; i < other.length; i++) {
        const sigChunk = sig[i] ?? 0;
        if ((sigChunk & other[i]) !== other[i]) {
            return false;
        }
    }
    return true;
}
/**
 * Checks whether the two signatures are equivalent.
 */
export function signatureEquals(sig, other) {
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
export function signatureOverlaps(sig, other) {
    const minLength = Math.min(sig.length, other.length);
    for (let i = 0; i < minLength; i++) {
        if ((sig[i] & other[i]) !== 0) {
            return true;
        }
    }
    return false;
}
/**
 * Adds a component bit to a signature.
 */
function signatureAdd(sig, componentId) {
    const chunkIndex = Math.floor(componentId / BIT_CHUNK_SIZE);
    const bitIndex = componentId % BIT_CHUNK_SIZE;
    // Extend array if needed
    const result = sig.slice();
    while (result.length <= chunkIndex) {
        result.push(0);
    }
    result[chunkIndex] |= 1 << bitIndex;
    return result;
}
/**
 * Removes component bits from a signature.
 */
function signatureRemove(sig, componentId) {
    const chunkIndex = Math.floor(componentId / BIT_CHUNK_SIZE);
    const bitIndex = componentId % BIT_CHUNK_SIZE;
    const result = sig.slice();
    if (chunkIndex < result.length) {
        result[chunkIndex] &= ~(1 << bitIndex);
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
function signatureIsEmpty(sig) {
    for (let i = 0; i < sig.length; i++) {
        if (sig[i] !== 0)
            return false;
    }
    return true;
}
/**
 * Converts a Signature to a string key for Map lookups.
 * TODO: Optimize by caching key in Signature object if this becomes a bottleneck.
 */
function signatureToKey(sig) {
    return sig.join(",");
}
export function ConductSpawnEntity() {
    if (freeEntityIds.length > 0) {
        return freeEntityIds.pop();
    }
    return nextEntityId++;
}
function createArchetype(signature) {
    const archetype = {
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
function growArchetype(archetype) {
    const newCapacity = archetype.capacity * ARCHETYPE_GROWTH_FACTOR;
    // Grow entities array - fill to make packed array
    const newEntities = new Array(newCapacity).fill(0);
    for (let i = 0; i < archetype.count; i++) {
        newEntities[i] = archetype.entities[i];
    }
    archetype.entities = newEntities;
    // Grow all column arrays - fill to make packed array
    for (const columnKey in archetype.columns) {
        const oldColumn = archetype.columns[columnKey];
        const newColumn = new Array(newCapacity).fill(0);
        for (let i = 0; i < archetype.count; i++) {
            newColumn[i] = oldColumn[i];
        }
        archetype.columns[columnKey] = newColumn;
    }
    archetype.capacity = newCapacity;
}
function addComponent(entityId, component, data) {
    const componentId = registerComponentId(component);
    // const componentId = component[ComponentId];
    // if (componentId === undefined) {
    //   // Component was never registered which means it's never used in a query/system.
    //   // While maybe this is unexpected behavior, we don't need to add a component
    //   // that is never queried for.
    //   return;
    // }
    const existingLocation = entityLocations.get(entityId);
    const componentSig = createSignature([componentId]);
    if (existingLocation) {
        // Check if entity already has this component
        const existingSig = existingLocation.archetype.signature;
        if (signatureContains(existingSig, componentSig)) {
            // Component already exists on entity - no-op
            return;
        }
    }
    // Build the new signature: existing components + new component
    const newSignature = existingLocation
        ? signatureAdd(existingLocation.archetype.signature, componentId)
        : componentSig;
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
            dstArch.columns[columnKey][dstRow] = srcArch.columns[columnKey][srcRow];
        }
        // Remove from source archetype using swap-remove
        const lastRow = srcArch.count - 1;
        if (srcRow !== lastRow) {
            const lastEntityId = srcArch.entities[lastRow];
            srcArch.entities[srcRow] = lastEntityId;
            for (const columnKey in srcArch.columns) {
                srcArch.columns[columnKey][srcRow] =
                    srcArch.columns[columnKey][lastRow];
            }
            entityLocations.set(lastEntityId, { archetype: srcArch, row: srcRow });
        }
        srcArch.count--;
    }
    // Add the new component's data
    const instance = new component();
    const componentName = component.name;
    if (data) {
        if (typeof data === "function") {
            data(instance);
        }
        else {
            for (const key in data) {
                if (Object.hasOwn(instance, key)) {
                    // @ts-ignore
                    instance[key] = data[key];
                }
            }
        }
    }
    for (const key of Object.keys(instance)) {
        const columnKey = `${componentName}.${componentId}.${key}`;
        if (!dstArch.columns[columnKey]) {
            dstArch.columns[columnKey] = new Array(dstArch.capacity).fill(0);
        }
        // @ts-ignore
        dstArch.columns[columnKey][dstRow] = instance[key];
    }
    // Update entity location
    entityLocations.set(entityId, { archetype: dstArch, row: dstRow });
}
function removeComponent(entityId, component) {
    const location = entityLocations.get(entityId);
    if (!location)
        return false;
    const { archetype: srcArch, row: srcRow } = location;
    const componentId = component[ComponentId];
    if (componentId === undefined)
        return false;
    // Check if entity actually has this component
    const componentSig = createSignature([componentId]);
    if (!signatureContains(srcArch.signature, componentSig))
        return false;
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
    const componentPrefix = `${component.name}.${componentId}.`;
    for (const columnKey in srcArch.columns) {
        if (columnKey.startsWith(componentPrefix))
            continue;
        if (!dstArch.columns[columnKey]) {
            dstArch.columns[columnKey] = new Array(dstArch.capacity).fill(0);
        }
        dstArch.columns[columnKey][dstRow] = srcArch.columns[columnKey][srcRow];
    }
    // Remove from source archetype using swap-remove
    const lastRow = srcArch.count - 1;
    if (srcRow !== lastRow) {
        const lastEntityId = srcArch.entities[lastRow];
        srcArch.entities[srcRow] = lastEntityId;
        for (const columnKey in srcArch.columns) {
            srcArch.columns[columnKey][srcRow] = srcArch.columns[columnKey][lastRow];
        }
        entityLocations.set(lastEntityId, { archetype: srcArch, row: srcRow });
    }
    srcArch.count--;
    // Update entity location to new archetype
    entityLocations.set(entityId, { archetype: dstArch, row: dstRow });
    return true;
}
// export function getComponentRead<T extends ComponentConstructor>(entity: ConductEntity, Component: T): Readonly<InstanceType<T>> | undefined {
//   const location = entityLocations.get(entity);
//   if (!location) return;
//
//   const component = {};
//   for (const key in location.archetype.columns[location.row]) {
//     if (key.startsWith(Component.name + ".")) {
//       // @ts-ignore
//       component[key.substring(Component.name.length + 1)] = location.archetype.columns[location.row][key];
//     }
//   }
//   // @ts-ignore
//   return component;
// }
function deleteEntity(entityId) {
    const location = entityLocations.get(entityId);
    if (!location)
        return false;
    const { archetype, row } = location;
    const lastRow = archetype.count - 1;
    if (row !== lastRow) {
        // Swap last entity into the deleted slot
        const lastEntityId = archetype.entities[lastRow];
        // Swap entity ID
        archetype.entities[row] = lastEntityId;
        // Swap all column data
        for (const columnKey in archetype.columns) {
            const column = archetype.columns[columnKey];
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
export function ConductAddComponent(entity, component, data) {
    commandQueue.push({ type: 'addComponent', entity, component, data });
}
export function ConductRemoveComponent(entity, component) {
    commandQueue.push({ type: 'removeComponent', entity, component });
}
export function ConductDeleteEntity(entity) {
    commandQueue.push({ type: 'deleteEntity', entity });
}
function flushCommands() {
    for (let i = 0; i < commandQueue.length; i++) {
        const cmd = commandQueue[i];
        switch (cmd.type) {
            case 'addComponent':
                addComponent(cmd.entity, cmd.component, cmd.data);
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
export function query(q) {
    // Check if cache is valid
    if (q.cache && q.cacheGeneration === archetypeGeneration) {
        return q.cache;
    }
    const results = [];
    for (let i = 0; i < archetypes.length; i++) {
        const arch = archetypes[i];
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
 */
export function ConductRegisterSystem(system) {
    // Type erasure - the system gets compiled to a function without arguments
    const registeredSystem = system;
    allRegisteredSystems.add(registeredSystem);
    return registeredSystem;
}
/** Current delta time in seconds since last frame */
export let deltaTime = 0;
/** Time of the current frame in seconds */
export let time = 0;
let loopId = null;
let lastFrameTime = 0;
/**
 * Start the main Conduct ECS loop, executing all registered systems.
 * Uses requestAnimationFrame for browser-compatible rendering.
 */
export function ConductStart() {
    if (loopId !== null)
        return; // Already running
    const systems = Array.from(allRegisteredSystems);
    lastFrameTime = performance.now();
    function loop(currentTime) {
        deltaTime = (currentTime - lastFrameTime) / 1000; // Convert to seconds
        time = currentTime / 1000;
        lastFrameTime = currentTime;
        for (const system of systems) {
            system();
        }
        flushCommands();
        loopId = requestAnimationFrame(loop);
    }
    loopId = requestAnimationFrame(loop);
}
/**
 * Stop the main Conduct ECS loop.
 */
export function ConductStop() {
    if (loopId !== null) {
        cancelAnimationFrame(loopId);
        loopId = null;
    }
}
/**
 * Start the main Conduct ECS loop, executing all registered systems.
 */
export function ConductBenchmarkStart(iterations = 1_000) {
    let count = 0;
    const systems = Array.from(allRegisteredSystems);
    while (true) {
        for (const system of systems) {
            system();
        }
        flushCommands();
        count++;
        if (count > iterations) {
            break;
        }
    }
}
//# sourceMappingURL=core.js.map