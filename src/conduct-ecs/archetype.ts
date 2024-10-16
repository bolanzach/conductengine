import { Component, ComponentConstructor } from "./component";
import { Entity } from "./entity";

type ComponentTable = Map<ComponentConstructor, Component[]>;

export type Signature = number[];

export default interface Archetype {
  signature: Signature;
  components: ComponentTable;
  entities: Entity[];
}

/**
 * Checks whether the `other` signature is contained within the `sig` signature.
 */
export function signatureCompare(sig: Signature, other: Signature): boolean {
  // @todo this can be optimized
  return sig.every((id) => other.includes(id));
}
