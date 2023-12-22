import {
  Component,
  ComponentConstructor,
  TestComponent,
  ZachComponent,
} from './component';
import { Entity } from './entity';

type SystemComponentDeps = {
  queryWith: ComponentConstructor[];
  queryWithout: ComponentConstructor[];
};

export const REGISTERED_SYSTEMS: Map<Function, SystemComponentDeps> = new Map();

function registerSystemComponents(
  system: Function,
  components:
    | Pick<SystemComponentDeps, 'queryWith'>
    | Pick<SystemComponentDeps, 'queryWithout'>
) {
  let deps = REGISTERED_SYSTEMS.get(system);
  deps = {
    queryWith: [],
    queryWithout: [],
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

  REGISTERED_SYSTEMS.set(system, deps);
}

function queryForComponentsDecorator(target: any, key: any): any {
  const cstr = target.constructor;
  const paramTypes = Reflect.getMetadata(
    'design:paramtypes',
    target,
    key
  ) as ComponentConstructor[];
  registerSystemComponents(cstr, { queryWith: paramTypes.slice(1) });
}

function queryWithoutComponentsDecorator(
  ...components: ComponentConstructor[]
) {
  return function (target: any, key: any): any {
    const cstr = target.constructor;
    registerSystemComponents(cstr, { queryWithout: components });
  };
}

export const QueryForComponents = queryForComponentsDecorator;
export const QueryWithout = queryWithoutComponentsDecorator;

/**
 * A System contains an `update` method that is called once per frame. Update operates on Components that
 * are attached to Entities. Use the `@QueryForComponents` decorator to specify which Components your System
 * should query and operate on.
 *
 * @example
 *
 * // This System will be called once per frame and will log the message from the LoggerComponent
 * class LogSystem {
 *    [@QueryForComponents]
 *    update(e: Entity, logger: LoggerComponent) {
 *      console.log(logger.msg);
 *    }
 * }
 *
 * // Register the LogSystem with the World
 * const world = new World();
 * world.registerSystem(new LogSystem());
 */
export interface System {
  update(
    entity: Entity,
    ...components: (Component | Readonly<Component>)[]
  ): void;
}

export class TestSystem implements System {
  @QueryForComponents
  update(e: Entity, t: TestComponent, z: ZachComponent) {
    console.log(e, t.msg);
  }
}

export class TestSystemTwo implements System {
  @QueryForComponents
  @QueryWithout(ZachComponent)
  update(e: Entity, t: TestComponent) {
    console.log(e, t.msg);
  }
}
