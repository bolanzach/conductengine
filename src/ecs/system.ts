import {
  Component,
  ComponentConstructor,
  TestComponent,
  ZachComponent,
} from './component';
import { Entity } from './entity';

export const REGISTERED_SYSTEMS: Map<Function, ComponentConstructor[]> =
  new Map();

function registerSystemComponents(
  system: Function,
  components: ComponentConstructor[]
) {
  REGISTERED_SYSTEMS.set(system, components.slice(1));
}

function queryForComponentsDecorator(target: any, key: any): any {
  const cstr = target.constructor;
  const paramTypes = Reflect.getMetadata('design:paramtypes', target, key);
  registerSystemComponents(cstr, paramTypes);
}

export const QueryForComponents = queryForComponentsDecorator;

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
  update(entity: Entity, ...components: Component[]): void;
}

export class TestSystem {
  @QueryForComponents
  update(e: Entity, t: TestComponent, z: ZachComponent) {
    console.log(e, t.msg, z);
  }
}
