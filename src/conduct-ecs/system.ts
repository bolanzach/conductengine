import * as SYSTEM_DEFINITIONS from "@/conduct-ecs/systemDefinitions";

import { Component, COMPONENT_ID, ComponentConstructor } from "./component";
import { Entity } from "./entity";
import { createSignature, Signature } from "./signature";
import { World } from "./world";

export const SYSTEM_PARAMS = Symbol("SYSTEM_PARAMS");
export const SYSTEM_SIGNATURE = Symbol("SYSTEM_SIG");

/**
 * Declare the Component types that a System should query for and operate on.
 * When iterating over a Query, the first element is always the Entity, followed
 * by the declared Components. A Query contains additional properties for
 * accessing global variables, such as the World.
 */
export type Query<T extends Component[]> = [Entity, ...T][] & SystemParams;

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
export type System = (query: Query<never>) => void;

// Private counter to assign a unique ID to each Component as they are
// registered along with a System.
let componentIdCounter = 1;

(function registerSystemDefinitions() {
  Object.values(SYSTEM_DEFINITIONS).forEach((systemDef) => {
    const { system, queryWith } = systemDef;

    // Add a Component ID to each Component Constructor
    queryWith.forEach((cstr) => {
      if (!cstr[COMPONENT_ID]) {
        cstr[COMPONENT_ID] = componentIdCounter++;
      }
    });

    // @ts-expect-error adds metadata to the System function
    system[SYSTEM_PARAMS] = {
      queryWith,
      queryWithout: [],
    };

    // @ts-expect-error adds metadata to the System function
    system[SYSTEM_SIGNATURE] = {
      queryWith: createSignature(
        queryWith.map((cstr) => cstr[COMPONENT_ID] as number)
      ),
      queryWithout: createSignature([]),
    };
  });
})();

/**
 * Stored on each System to declare how the System should query Components.
 */
interface SystemComponentDeps {
  queryWith: ComponentConstructor[];
  queryWithout: ComponentConstructor[];
}

interface SystemSignature {
  queryWith: Signature;
  queryWithout: Signature;
}

interface SystemParams {
  world: World;
  time: Readonly<{
    /**
     * The current cycle, incremented each frame.
     */
    tick: number;
    delta: number;
    timestamp: number;
  }>;
}

/**
 * A System that is called a single time, when the World is initialized.
 */
export type SystemInit = (world: World) => void;

/**
 * A system's Component Query Params are stored on the registered constructor.
 */
export type SystemConstructor = Function & {
  [SYSTEM_PARAMS]: SystemComponentDeps;
  [SYSTEM_SIGNATURE]: SystemSignature;
};
