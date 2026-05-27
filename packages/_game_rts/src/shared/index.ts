// RTS shared game logic (components, shared systems, types)
// This code runs on both client and server.

import { ConductBundle } from "@conduct/networking/replication";

export const BUNDLE = {
  PLAYER: 1,
  GROUND: 2,
} as const;

export type BundleRegistry = Record<typeof BUNDLE[keyof typeof BUNDLE], ConductBundle>;

export function startRTS(bundles: BundleRegistry) {
  bundles[BUNDLE.GROUND]();
}