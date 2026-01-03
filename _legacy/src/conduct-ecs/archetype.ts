import {
  Component,
  COMPONENT_ID,
  COMPONENT_TYPE,
  ComponentType,
} from "./component";
import { Entity } from "./entity";
import { createSignature, Signature } from "./signature";

type ComponentTable = Component[][];

export interface Archetype {
  signature: Signature;

  /**
   * Stores components in a 2D array where each row is a component type and
   * the columns are in index to the entity.
   *
   *  entity1      entity2    entity3
   *  --------------------------------
   *  | ComponentA ComponentA ComponentA
   *  | ComponentB ComponentB ComponentB
   *
   */
  components: ComponentTable;

  /**
   * An entity's index in this array is the same as the index in the components
   */
  entities: Entity[];

  /**
   * Maps a component type to the index in the components array.
   */
  componentIndex: Map<ComponentType, number>;
}

export function createArchetype(
  components: ComponentTable,
  entities: Entity[]
): Archetype {
  const componentIds = components.map(
    (component) => component[0][COMPONENT_TYPE][COMPONENT_ID] as number
  );
  const signature = createSignature(componentIds);

  return {
    signature,
    components,
    entities,
    componentIndex: new Map(
      components.map((component, i) => [component[0][COMPONENT_TYPE], i])
    ),
  };
}

export function updateArchetype(
  archetype: Archetype,
  components: Component[],
  entity: Entity
): Archetype {
  archetype.entities.push(entity);
  components.forEach((component, i) => {
    const componentIndex = archetype.componentIndex.get(
      component[COMPONENT_TYPE]
    );
    if (componentIndex !== undefined) {
      archetype.components[componentIndex].push(component);
    }
  });
  return archetype;
}
