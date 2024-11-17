import { Query } from "@/conduct-ecs/query";

import { COMPONENT_ID, ComponentConstructor } from "./component";
import { createSignature, Signature } from "./signature";
import { World } from "./world";

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
let componentIdCounter = 1;

export function registerSystemDefinitions(systemDefinitions: {
  string: { system: System; queryWith: ComponentConstructor[][] };
}) {
  Object.values(systemDefinitions).forEach((systemDef) => {
    const { system, queryWith } = systemDef;

    // Add a Component ID to each Component Constructor
    queryWith.forEach((cstrs) => {
      cstrs.forEach((cstr) => {
        if (!cstr[COMPONENT_ID]) {
          cstr[COMPONENT_ID] = componentIdCounter++;
        }
      });
    });

    // @ts-expect-error We need to do this - this is what creates a RegisteredSystem
    system[SYSTEM_SIGNATURE] = {
      componentDeps: queryWith,
      signatures: queryWith.map((componentQuery) =>
        createSignature(
          componentQuery.map((cstr) => cstr[COMPONENT_ID] as number)
        )
      ),
    };
  });
}

/**
 * Stored on each System to declare how the System should query Components.
 */
interface SystemSignature {
  signatures: Signature[];
  componentDeps: ComponentConstructor[][];
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
