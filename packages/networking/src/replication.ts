import type { SerializePrimitive } from "./protocol.js";

/**
 * A component class eligible for replication. All fields must be SerializePrimitive.
 */
type ReplicableComponent = new () => Record<string, SerializePrimitive>;

const replicatedComponents = new Map<string, ReplicableComponent>();

/**
 * Register a component type as eligible for network replication.
 * Only registered component types will be included in snapshots.
 * All fields on the component must be number or boolean.
 */
export function ConductReplicateComponent(component: ReplicableComponent): void {
  replicatedComponents.set(component.name, component);
}

/**
 * Get all registered replicable component types.
 */
export function getReplicatedComponents(): ReadonlyMap<string, ReplicableComponent> {
  return replicatedComponents;
}

/**
 * Entities with Replicated are included in network snapshots.
 */
export class ReplicatedTag {}