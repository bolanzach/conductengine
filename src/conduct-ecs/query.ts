import { Archetype } from "@/conduct-ecs/archetype";
import { Component, ComponentType } from "@/conduct-ecs/component";
import { Entity } from "@/conduct-ecs/entity";
import { QueryElement, QueryOperator } from "@/conduct-ecs/operators";
import {
  Signature,
  signatureContains,
  signatureOverlaps,
} from "@/conduct-ecs/signature";
import { World } from "@/conduct-ecs/world";

/**
 * Filter configuration for query operators like Not and Optional.
 */
export interface QueryFilter {
  /** Signature of components that must NOT be present (for Not operator) */
  notSignature: Signature;
  /** Component types that are optional (for Optional operator) */
  optionalTypes: ComponentType[];
}

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
    : Element extends Component
      ? Rest extends QueryElement[]
        ? [Element, ...FilterDataComponents<Rest>]
        : [Element]
      : []
  : [];

type ServiceArgs<T extends Component[]> = [Entity, ...T];

/**
 * Declare the Component types that a System should query for and operate on.
 * When iterating over a Query, the first element is always the Entity, followed
 * by the declared Components. A Query contains additional properties for
 * accessing global variables, such as the World.
 *
 * Supports operators like Not<[...]> and Optional<[...]> to filter entities.
 *
 * @example
 * // Query entities with PersonComponent but NOT DeadComponent
 * Query<[PersonComponent, Not<[DeadComponent]>]>
 */
export class Query<T extends QueryElement[]> {
  public world: World = undefined as unknown as World;

  /**
   * Cache references to archetype entities and components that match the Query.
   */
  private records: [Entity[], Component[][]][] = [] as unknown as [
    Entity[],
    Component[][],
  ][];

  constructor(
    private signature: Signature = [],
    private componentTypes: ComponentType[] = [],
    private filter: QueryFilter = { notSignature: [], optionalTypes: [] }
  ) {}

  handleNewArchetype(archetype: Archetype) {
    // Must contain all required components
    if (!signatureContains(this.signature, archetype.signature)) {
      return;
    }

    // Must NOT contain any excluded components (Not operator)
    if (
      this.filter.notSignature.length > 0 &&
      signatureOverlaps(this.filter.notSignature, archetype.signature)
    ) {
      return;
    }

    const components: Component[][] = [];
    for (let i = 0; i < this.componentTypes.length; i++) {
      const componentIndex = archetype.componentIndex.get(
        this.componentTypes[i]
      );
      if (componentIndex === undefined) {
        console.error(
          `Component not found in archetype: ${this.componentTypes[i]}`
        );
        return;
      }
      components[i] = archetype.components[componentIndex];
    }
    this.records.push([archetype.entities, components]);
  }

  /**
   * Invoke the `iteree` callback function for each Entity that matches the
   * Query. The callback is passed the Entity and the requested Components.
   * @param iteree
   */
  iter(iteree: (arg: ServiceArgs<FilterDataComponents<T>>) => void) {
    const length = this.componentTypes.length;
    const params = new Array(length + 1);
    for (let a = 0; a < this.records.length; a++) {
      const record = this.records[a];
      const entities = record[0];
      const components = record[1];
      for (let e = 0, eCount = entities.length; e < eCount; e++) {
        params[0] = entities[e];
        for (let p = 0; p < length; p++) {
          params[p + 1] = components[p][e];
        }
        // @ts-expect-error this is fine.
        iteree(params);
      }
    }
  }

  /**
   * Find the first Entity that matches the Query.
   * The `filter` function is optional and can be used to refine the search.
   */
  findOne(
    filter: (arg: ServiceArgs<FilterDataComponents<T>>) => boolean = () => true
  ): ServiceArgs<FilterDataComponents<T>> | undefined {
    const length = this.componentTypes.length;
    const params = new Array(length + 1);
    for (let a = 0; a < this.records.length; a++) {
      const record = this.records[a];
      const entities = record[0];
      const components = record[1];
      for (let e = 0, eCount = entities.length; e < eCount; e++) {
        params[0] = entities[e];
        for (let p = 0; p < length; p++) {
          params[p + 1] = components[p][e];
        }

        // @ts-expect-error this is fine.
        if (filter(params)) {
          // @ts-expect-error this is fine.
          return params;
        }
      }
    }
    return undefined;
  }
}
