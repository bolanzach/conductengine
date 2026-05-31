// RTS shared game logic (components, shared systems, types)
// This code runs on both client and server.

import { type ConductBundle, ConductSpawnBundle } from "@conduct/ecs";

export const BUNDLE = {
  SPACE_MARINE: 1,
  GROUND: 2,
} as const;

export type BundleRegistry = Record<typeof BUNDLE[keyof typeof BUNDLE], ConductBundle>;

export function startRTS(bundles: BundleRegistry) {
  ConductSpawnBundle(bundles[BUNDLE.GROUND]);
}
