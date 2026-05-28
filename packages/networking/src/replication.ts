import type { SerializePrimitive } from "./protocol.js";
import type { ConductEntity, ComponentConstructor } from "@conduct/ecs";

export type ConductBundle = () => ConductEntity;

type SerializableComponentConstructor = ComponentConstructor & (new () => Record<string, SerializePrimitive>);

/**
 * Internal registry of replicable components where the index in the array is the component's network ID.
 */
const replicatedComponents: SerializableComponentConstructor[] = [];
let nextReplicatedComponentIdx = 0;

/**
 * Map from component name to network ID index in replicatedComponents.
 */
const replicatedComponentIdxMap = new Map<string, number>();

/**
 * Register a component type as eligible for network replication.
 * Only registered component types will be included in snapshots.
 * All fields on the component must be SerializePrimitive (boolean | number).
 */
export function ConductNetworkReplicateComponent<T extends ComponentConstructor>(
  component: InstanceType<T>[keyof InstanceType<T>] extends SerializePrimitive ? T : never
): void {
  const componentName = component.name;
  if (replicatedComponentIdxMap.has(componentName)) {
    throw new Error(`Component ${componentName} is already registered for replication`);
  }

  replicatedComponents[nextReplicatedComponentIdx] = component as SerializableComponentConstructor;
  replicatedComponentIdxMap.set(componentName, nextReplicatedComponentIdx);
  nextReplicatedComponentIdx++;
}

/**
 * Get all registered replicable component types.
 */
export function getReplicatedComponents(): Readonly<SerializableComponentConstructor[]> {
  return replicatedComponents;
}

// /**
//  * Look up a registered replicable component.
//  */
// export function getReplicatedComponent(component: ComponentConstructor): ReplicableComponent | undefined {
//   return replicatedComponents[replicatedComponentIdxMap.get(name) ?? -1];
// }

/**
 * Entities with this component are included in network snapshots.
 */
export class Networked {
  // [key: string]: SerializePrimitive;

  bundle = 0;
  owner = 0;
}
