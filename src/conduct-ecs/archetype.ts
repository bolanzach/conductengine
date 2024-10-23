import {
  Component,
  COMPONENT_ID,
  COMPONENT_TYPE,
  ComponentConstructor,
} from "./component";
import { Entity } from "./entity";
import { createSignature, Signature } from "./signature";

type ComponentTable = Map<ComponentConstructor, Component[]>;

export interface Archetype {
  signature: Signature;
  components: ComponentTable;
  entities: Entity[];
}

export function createArchetype(
  components: ComponentTable,
  entities: Entity[]
): Archetype {
  const componentIds = Array.from(components.keys()).map(
    (c) => c[COMPONENT_ID] as number
  );
  const signature = createSignature(componentIds);

  return {
    signature,
    components,
    entities,
  };
}

export function updateArchetype(
  archetype: Archetype,
  components: Component[],
  entity: Entity
): Archetype {
  archetype.entities.push(entity);
  components.forEach((component, i) => {
    archetype.components.get(components[i][COMPONENT_TYPE])?.push(component);
  });
  return archetype;
}
