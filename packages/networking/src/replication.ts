import type { SerializePrimitive } from "./protocol.js";
import type { ComponentConstructor } from "@conduct/ecs";

type SerializableComponentConstructor = ComponentConstructor & (new () => Record<string, SerializePrimitive>);

/**
 * Internal registry of replicable components where the index in the array is the component's network ID.
 */
const replicatedComponents: SerializableComponentConstructor[] = [];
const entityRefFields: (string[] | undefined)[] = [];
let nextReplicatedComponentIdx = 0;

/**
 * Map from component name to network ID index in replicatedComponents.
 */
const replicatedComponentIdxMap = new Map<string, number>();

/**
 * Register a component type as eligible for network replication.
 * Only registered component types will be included in snapshots.
 * All fields on the component must be SerializePrimitive (boolean | number).
 *
 * Use `entityRefs` to specify fields that contain entity IDs. These will be
 * automatically translated from server IDs to local IDs on the client.
 */
export function ConductNetworkReplicateComponent<T extends ComponentConstructor>(
  component: InstanceType<T>[keyof InstanceType<T>] extends SerializePrimitive ? T : never,
  options?: { entityRefs?: (keyof InstanceType<T> & string)[] },
): void {
  const componentName = component.name;
  if (replicatedComponentIdxMap.has(componentName)) {
    throw new Error(`Component ${componentName} is already registered for replication`);
  }

  replicatedComponents[nextReplicatedComponentIdx] = component as SerializableComponentConstructor;
  entityRefFields[nextReplicatedComponentIdx] = options?.entityRefs;
  replicatedComponentIdxMap.set(componentName, nextReplicatedComponentIdx);
  nextReplicatedComponentIdx++;
}

/**
 * Get all registered replicable component types.
 */
export function getReplicatedComponents(): Readonly<SerializableComponentConstructor[]> {
  return replicatedComponents;
}

/**
 * Get the entity reference fields for a replicated component by network ID.
 */
export function getEntityRefFields(networkId: number): string[] | undefined {
  return entityRefFields[networkId];
}

// /**
//  * Look up a registered replicable component.
//  */
// export function getReplicatedComponent(component: ComponentConstructor): ReplicableComponent | undefined {
//   return replicatedComponents[replicatedComponentIdxMap.get(name) ?? -1];
// }
