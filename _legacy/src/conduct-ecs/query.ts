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

  private readonly params: unknown[];

  iter: (iteree: (arg: ServiceArgs<FilterDataComponents<T>>) => void) => void;

  constructor(
    private signature: Signature = [],
    private componentTypes: ComponentType[] = [],
    private filter: QueryFilter = { notSignature: [], optionalTypes: [] }
  ) {
    const count = componentTypes.length;
    this.params = new Array(count + 1);

    const iterFns = [
      this.#iter0,
      this.#iter1,
      this.#iter2,
      this.#iter3,
      this.#iter4,
      this.#iter5,
      this.#iter6,
      this.#iter7,
      this.#iter8,
      this.#iter9,
      this.#iter10,
      this.#iter11,
      this.#iter12,
    ];

    this.iter = (iterFns[count] ?? this.#iterN).bind(this);
  }

  #iter0(iteree: (arg: ServiceArgs<FilterDataComponents<T>>) => void) {
    const params = this.params;
    for (let a = 0; a < this.records.length; a++) {
      const entities = this.records[a][0];
      for (let e = 0, eCount = entities.length; e < eCount; e++) {
        params[0] = entities[e];
        // @ts-expect-error intentional
        iteree(params);
      }
    }
  }

  #iter1(iteree: (arg: ServiceArgs<FilterDataComponents<T>>) => void) {
    const params = this.params;
    for (let a = 0; a < this.records.length; a++) {
      const [entities, components] = this.records[a];
      const c0 = components[0];
      for (let e = 0, eCount = entities.length; e < eCount; e++) {
        params[0] = entities[e];
        params[1] = c0[e];
        // @ts-expect-error intentional
        iteree(params);
      }
    }
  }

  #iter2(iteree: (arg: ServiceArgs<FilterDataComponents<T>>) => void) {
    const params = this.params;
    for (let a = 0; a < this.records.length; a++) {
      const [entities, components] = this.records[a];
      const c0 = components[0];
      const c1 = components[1];
      for (let e = 0, eCount = entities.length; e < eCount; e++) {
        params[0] = entities[e];
        params[1] = c0[e];
        params[2] = c1[e];
        // @ts-expect-error intentional
        iteree(params);
      }
    }
  }

  #iter3(iteree: (arg: ServiceArgs<FilterDataComponents<T>>) => void) {
    const params = this.params;
    for (let a = 0; a < this.records.length; a++) {
      const [entities, components] = this.records[a];
      const c0 = components[0];
      const c1 = components[1];
      const c2 = components[2];
      for (let e = 0, eCount = entities.length; e < eCount; e++) {
        params[0] = entities[e];
        params[1] = c0[e];
        params[2] = c1[e];
        params[3] = c2[e];
        // @ts-expect-error intentional
        iteree(params);
      }
    }
  }

  #iter4(iteree: (arg: ServiceArgs<FilterDataComponents<T>>) => void) {
    const params = this.params;
    for (let a = 0; a < this.records.length; a++) {
      const [entities, components] = this.records[a];
      const c0 = components[0],
        c1 = components[1],
        c2 = components[2],
        c3 = components[3];
      for (let e = 0, eCount = entities.length; e < eCount; e++) {
        params[0] = entities[e];
        params[1] = c0[e];
        params[2] = c1[e];
        params[3] = c2[e];
        params[4] = c3[e];
        // @ts-expect-error intentional
        iteree(params);
      }
    }
  }

  #iter5(iteree: (arg: ServiceArgs<FilterDataComponents<T>>) => void) {
    const params = this.params;
    for (let a = 0; a < this.records.length; a++) {
      const [entities, components] = this.records[a];
      const c0 = components[0],
        c1 = components[1],
        c2 = components[2],
        c3 = components[3],
        c4 = components[4];
      for (let e = 0, eCount = entities.length; e < eCount; e++) {
        params[0] = entities[e];
        params[1] = c0[e];
        params[2] = c1[e];
        params[3] = c2[e];
        params[4] = c3[e];
        params[5] = c4[e];
        // @ts-expect-error intentional
        iteree(params);
      }
    }
  }

  #iter6(iteree: (arg: ServiceArgs<FilterDataComponents<T>>) => void) {
    const params = this.params;
    for (let a = 0; a < this.records.length; a++) {
      const [entities, components] = this.records[a];
      const c0 = components[0],
        c1 = components[1],
        c2 = components[2],
        c3 = components[3],
        c4 = components[4],
        c5 = components[5];
      for (let e = 0, eCount = entities.length; e < eCount; e++) {
        params[0] = entities[e];
        params[1] = c0[e];
        params[2] = c1[e];
        params[3] = c2[e];
        params[4] = c3[e];
        params[5] = c4[e];
        params[6] = c5[e];
        // @ts-expect-error intentional
        iteree(params);
      }
    }
  }

  #iter7(iteree: (arg: ServiceArgs<FilterDataComponents<T>>) => void) {
    const params = this.params;
    for (let a = 0; a < this.records.length; a++) {
      const [entities, components] = this.records[a];
      const c0 = components[0],
        c1 = components[1],
        c2 = components[2],
        c3 = components[3],
        c4 = components[4],
        c5 = components[5],
        c6 = components[6];
      for (let e = 0, eCount = entities.length; e < eCount; e++) {
        params[0] = entities[e];
        params[1] = c0[e];
        params[2] = c1[e];
        params[3] = c2[e];
        params[4] = c3[e];
        params[5] = c4[e];
        params[6] = c5[e];
        params[7] = c6[e];
        // @ts-expect-error intentional
        iteree(params);
      }
    }
  }

  #iter8(iteree: (arg: ServiceArgs<FilterDataComponents<T>>) => void) {
    const params = this.params;
    for (let a = 0; a < this.records.length; a++) {
      const [entities, components] = this.records[a];
      const c0 = components[0],
        c1 = components[1],
        c2 = components[2],
        c3 = components[3],
        c4 = components[4],
        c5 = components[5],
        c6 = components[6],
        c7 = components[7];
      for (let e = 0, eCount = entities.length; e < eCount; e++) {
        params[0] = entities[e];
        params[1] = c0[e];
        params[2] = c1[e];
        params[3] = c2[e];
        params[4] = c3[e];
        params[5] = c4[e];
        params[6] = c5[e];
        params[7] = c6[e];
        params[8] = c7[e];
        // @ts-expect-error intentional
        iteree(params);
      }
    }
  }

  #iter9(iteree: (arg: ServiceArgs<FilterDataComponents<T>>) => void) {
    const params = this.params;
    for (let a = 0; a < this.records.length; a++) {
      const [entities, components] = this.records[a];
      const c0 = components[0],
        c1 = components[1],
        c2 = components[2],
        c3 = components[3],
        c4 = components[4],
        c5 = components[5],
        c6 = components[6],
        c7 = components[7],
        c8 = components[8];
      for (let e = 0, eCount = entities.length; e < eCount; e++) {
        params[0] = entities[e];
        params[1] = c0[e];
        params[2] = c1[e];
        params[3] = c2[e];
        params[4] = c3[e];
        params[5] = c4[e];
        params[6] = c5[e];
        params[7] = c6[e];
        params[8] = c7[e];
        params[9] = c8[e];
        // @ts-expect-error intentional
        iteree(params);
      }
    }
  }

  #iter10(iteree: (arg: ServiceArgs<FilterDataComponents<T>>) => void) {
    const params = this.params;
    for (let a = 0; a < this.records.length; a++) {
      const [entities, components] = this.records[a];
      const c0 = components[0],
        c1 = components[1],
        c2 = components[2],
        c3 = components[3],
        c4 = components[4],
        c5 = components[5],
        c6 = components[6],
        c7 = components[7],
        c8 = components[8],
        c9 = components[9];
      for (let e = 0, eCount = entities.length; e < eCount; e++) {
        params[0] = entities[e];
        params[1] = c0[e];
        params[2] = c1[e];
        params[3] = c2[e];
        params[4] = c3[e];
        params[5] = c4[e];
        params[6] = c5[e];
        params[7] = c6[e];
        params[8] = c7[e];
        params[9] = c8[e];
        params[10] = c9[e];
        // @ts-expect-error intentional
        iteree(params);
      }
    }
  }

  #iter11(iteree: (arg: ServiceArgs<FilterDataComponents<T>>) => void) {
    const params = this.params;
    for (let a = 0; a < this.records.length; a++) {
      const [entities, components] = this.records[a];
      const c0 = components[0],
        c1 = components[1],
        c2 = components[2],
        c3 = components[3],
        c4 = components[4],
        c5 = components[5],
        c6 = components[6],
        c7 = components[7],
        c8 = components[8],
        c9 = components[9],
        c10 = components[10];
      for (let e = 0, eCount = entities.length; e < eCount; e++) {
        params[0] = entities[e];
        params[1] = c0[e];
        params[2] = c1[e];
        params[3] = c2[e];
        params[4] = c3[e];
        params[5] = c4[e];
        params[6] = c5[e];
        params[7] = c6[e];
        params[8] = c7[e];
        params[9] = c8[e];
        params[10] = c9[e];
        params[11] = c10[e];
        // @ts-expect-error intentional
        iteree(params);
      }
    }
  }

  #iter12(iteree: (arg: ServiceArgs<FilterDataComponents<T>>) => void) {
    const params = this.params;
    for (let a = 0; a < this.records.length; a++) {
      const [entities, components] = this.records[a];
      const c0 = components[0],
        c1 = components[1],
        c2 = components[2],
        c3 = components[3],
        c4 = components[4],
        c5 = components[5],
        c6 = components[6],
        c7 = components[7],
        c8 = components[8],
        c9 = components[9],
        c10 = components[10],
        c11 = components[11];
      for (let e = 0, eCount = entities.length; e < eCount; e++) {
        params[0] = entities[e];
        params[1] = c0[e];
        params[2] = c1[e];
        params[3] = c2[e];
        params[4] = c3[e];
        params[5] = c4[e];
        params[6] = c5[e];
        params[7] = c6[e];
        params[8] = c7[e];
        params[9] = c8[e];
        params[10] = c9[e];
        params[11] = c10[e];
        params[12] = c11[e];
        // @ts-expect-error intentional
        iteree(params);
      }
    }
  }

  #iterN(iteree: (arg: ServiceArgs<FilterDataComponents<T>>) => void) {
    const params = this.params;
    const length = this.componentTypes.length;
    for (let a = 0; a < this.records.length; a++) {
      const [entities, components] = this.records[a];
      for (let e = 0, eCount = entities.length; e < eCount; e++) {
        params[0] = entities[e];
        for (let p = 0; p < length; p++) {
          params[p + 1] = components[p][e];
        }
        // @ts-expect-error intentional
        iteree(params);
      }
    }
  }

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
