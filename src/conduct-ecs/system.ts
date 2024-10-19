import { Component, COMPONENT_ID, ComponentConstructor } from "./component";
import { Entity } from "./entity";
import { createSignature, Signature } from "./signature";
import { World } from "./world";

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

let componentIdCounter = 1;

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
export const SYSTEM_PARAMS = Symbol("SYSTEM_PARAMS");
export const SYSTEM_SIGNATURE = Symbol("SYSTEM_SIG");

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

export interface SystemInit {
  init(world: World): void;
}

/**
 * A system's Component Query Params are stored on the registered constructor.
 */
export type SystemConstructor = Function & {
  [SYSTEM_PARAMS]: SystemComponentDeps;
  [SYSTEM_SIGNATURE]: SystemSignature;
};
