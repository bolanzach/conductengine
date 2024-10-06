import { Entity } from './entity';
import { World } from './world';

export interface Bundle {
  build(world: World): Entity;
}

export type BundleConstructor<T extends Bundle = Bundle> = new () => T;
