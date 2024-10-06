import { Entity } from './entity';
import { World } from './world';

export interface BuildBundleData {
  isSpawned?: boolean;
}

export interface Bundle {
  build(world: World, data: BuildBundleData): Entity;
}

export type BundleConstructor<T extends Bundle = Bundle> = new () => T;
