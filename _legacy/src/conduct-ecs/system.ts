import { Query, QueryFilter } from "@/conduct-ecs/query";

import { COMPONENT_ID, ComponentConstructor } from "./component";
import { createSignature, Signature } from "./signature";
import { World } from "./world";

/**
 * Query definition with operator support.
 */
export interface QueryDefinition {
  dataComponents: ComponentConstructor[];
  filterComponents: {
    not: ComponentConstructor[];
    optional: ComponentConstructor[];
  };
}

/**
 * System definition with operator support.
 */
export interface SystemDefinition {
  system: System;
  queries: QueryDefinition[];
}

export const SYSTEM_SIGNATURE = Symbol("SYSTEM_SIG");

/**
 * A System is a function that operates on a collection of Components. Each
 * System is run once per game tick after registering with the World.
 *
 * @example
 * export default function MySystem(query: Query<[AComponent, BComponent]>) {
 *  for (const [entity, a, b] of query) {
 *    // Do something with a and b
 *  }
 * }
 *
 * // Register the System
 * world.registerSystem(MySystem);
 */
export type System = (...queries: Query<never>[]) => void;

export type RegisteredSystem = System & {
  [SYSTEM_SIGNATURE]: SystemSignature;
};

/**
 * A System that is called a single time, when the World is initialized.
 */
export type SystemInit = (world: World) => void;

// Private counter to assign a unique ID to each Component as they are
// registered along with a System.
let componentIdCounter = 0;

export function registerSystemDefinitions(systemDefinitions: {
  [key: string]: SystemDefinition;
}) {
  Object.values(systemDefinitions).forEach((systemDef) => {
    const { system, queries: queryDefs } = systemDef;

    queryDefs.forEach((queryDef) => {
      const allComponents = [
        ...queryDef.dataComponents,
        ...queryDef.filterComponents.not,
        ...queryDef.filterComponents.optional,
      ];
      allComponents.forEach((cstr) => {
        if (!cstr[COMPONENT_ID]) {
          cstr[COMPONENT_ID] = componentIdCounter++;
        }
      });
    });

    const signatures = queryDefs.map((queryDef) =>
      createSignature(
        queryDef.dataComponents.map((cstr) => cstr[COMPONENT_ID] as number)
      )
    );

    const filters: QueryFilter[] = queryDefs.map((queryDef) => ({
      notSignature: createSignature(
        queryDef.filterComponents.not.map((c) => c[COMPONENT_ID] as number)
      ),
      optionalTypes: queryDef.filterComponents.optional,
    }));

    const queries = queryDefs.map(
      (queryDef, i) =>
        new Query(signatures[i], queryDef.dataComponents, filters[i])
    );

    // @ts-expect-error this is what creates a RegisteredSystem
    system[SYSTEM_SIGNATURE] = {
      componentDeps: queryDefs.map((q) => q.dataComponents),
      signatures,
      queries,
    };
  });
}

/**
 * Stored on each System to declare how the System should query Components.
 */
interface SystemSignature {
  signatures: Signature[];
  componentDeps: ComponentConstructor[][];
  queries: Query<never>[];
}

// interface SystemParams {
//   world: World;
//   time: Readonly<{
//     /**
//      * The current cycle, incremented each frame.
//      */
//     tick: number;
//     delta: number;
//     timestamp: number;
//   }>;
// }
