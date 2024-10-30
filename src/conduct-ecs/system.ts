import * as SYSTEM_DEFINITIONS from "@/conduct-ecs/systemDefinitions";

import { Component, COMPONENT_ID, ComponentConstructor } from "./component";
import { Entity } from "./entity";
import { createSignature, Signature } from "./signature";
import { World } from "./world";

export const SYSTEM_PARAMS = Symbol("SYSTEM_PARAMS");
export const SYSTEM_SIGNATURE = Symbol("SYSTEM_SIG");

export type SystemUpdate<A, B, C, D, E, F, G, H, I, J, K, L> =
  | ((params: SystemParams, a: A) => void)
  | ((params: SystemParams, a: A, b: B) => void)
  | ((params: SystemParams, a: A, b: B, c: C) => void)
  | ((params: SystemParams, a: A, b: B, c: C, d: D) => void)
  | ((params: SystemParams, a: A, b: B, c: C, d: D, e: E) => void)
  | ((params: SystemParams, a: A, b: B, c: C, d: D, e: E, f: F) => void)
  | ((params: SystemParams, a: A, b: B, c: C, d: D, e: E, f: F, g: G) => void)
  | ((
      params: SystemParams,
      a: A,
      b: B,
      c: C,
      d: D,
      e: E,
      f: F,
      g: G,
      h: H
    ) => void)
  | ((
      params: SystemParams,
      a: A,
      b: B,
      c: C,
      d: D,
      e: E,
      f: F,
      g: G,
      h: H,
      i: I
    ) => void)
  | ((
      params: SystemParams,
      a: A,
      b: B,
      c: C,
      d: D,
      e: E,
      f: F,
      g: G,
      h: H,
      i: I,
      j: J
    ) => void)
  | ((
      params: SystemParams,
      a: A,
      b: B,
      c: C,
      d: D,
      e: E,
      f: F,
      g: G,
      h: H,
      i: I,
      j: J,
      k: K
    ) => void)
  | ((
      params: SystemParams,
      a: A,
      b: B,
      c: C,
      d: D,
      e: E,
      f: F,
      g: G,
      h: H,
      i: I,
      j: J,
      k: K,
      l: L
    ) => void);

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

/**
 * Every Component Type gets assigned a unique ID.
 */
function registerComponentIds(componentCstrs: ComponentConstructor[]) {
  componentCstrs.forEach((cstr) => {
    if (!cstr[COMPONENT_ID]) {
      cstr[COMPONENT_ID] = componentIdCounter++;
    }
  });
}

function registerSystemComponents(
  system: SystemConstructor,
  components:
    | Pick<SystemComponentDeps, "queryWith">
    | Pick<SystemComponentDeps, "queryWithout">
) {
  let deps: SystemComponentDeps | undefined = system[SYSTEM_PARAMS];
  if (!deps) {
    deps = {
      queryWith: [],
      queryWithout: [],
    };
  }
  deps = {
    ...deps,
    ...components,
  };

  deps.queryWith.forEach((c) => {
    if (deps?.queryWithout.includes(c)) {
      throw new Error(
        `System ${system} cannot query for component ${c.name} with and without`
      );
    }
  });

  registerComponentIds([...deps.queryWith, ...deps.queryWithout]);

  system[SYSTEM_PARAMS] = deps;
  system[SYSTEM_SIGNATURE] = {
    queryWith: createSignature(
      deps.queryWith.map((cstr) => cstr[COMPONENT_ID] as number)
    ),
    queryWithout: createSignature(
      deps.queryWithout.map((cstr) => cstr[COMPONENT_ID] as number)
    ),
  };
}

function queryComponentsDecorator(query?: { Without: ComponentConstructor[] }) {
  return function (target: any, key: any): any {
    const cstr = target.constructor;
    const paramTypes = Reflect.getMetadata(
      "design:paramtypes",
      target,
      key
    ) as ComponentConstructor[];
    const componentTypes = paramTypes.slice(1);
    if (componentTypes.some((fn) => fn.name.toLowerCase() === "object")) {
      throw new Error(
        `System ${cstr.name} has an invalid component in @Query. A Component can not have a constructor.`
      );
    }
    registerSystemComponents(cstr, { queryWith: componentTypes });

    if (query) {
      registerSystemComponents(cstr, { queryWithout: query.Without });
    }
  };
}

export const Query = queryComponentsDecorator;

/**
 * The first parameter in each System Update call.
 */
export interface SystemParams {
  /**
   * The Entity that the System is currently operating on.
   */
  entity: Entity;
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
 * A System contains an `Update` method that is called once per frame. Update operates on Components that
 * are attached to Entities. Use the `@Query` decorator to specify which Components your System
 * should query and operate on.
 *
 * @example
 *
 * // This System will query for all Entities that have a LoggerComponent and log the message
 * class LogSystem {
 *    [@Query()]
 *    Update({ entity, world }: SystemParams, logger: LoggerComponent) {
 *      console.log(logger.msg);
 *    }
 * }
 *
 * // Register the LogSystem with the World
 * const world = new World();
 * world.registerSystem(new LogSystem());
 */
export interface System {
  update(params: SystemParams, ...components: Component[]): void;
}

/**
 * A System that is called a single time, when the World is initialized.
 */
export interface SystemInit {
  init(world: World): void;
}

/**
 * A System that is called a single time, when the World is initialized.
 */
export type SystemStartup = (params: SystemParams) => void;

/**
 * WIP DO NOT USE
 *
 * Can experiment with marking a System as Read-Only to prevent it from
 * modifying data. This could open up possible multi-threading optimizations.
 */
export interface ReadSystem extends System {
  update(params: SystemParams, ...components: Readonly<Component>[]): void;
}

/**
 * A system's Component Query Params are stored on the registered constructor.
 */
export type SystemConstructor = Function & {
  [SYSTEM_PARAMS]: SystemComponentDeps;
  [SYSTEM_SIGNATURE]: SystemSignature;
};
