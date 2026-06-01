// RTS shared game logic (components, shared systems, types)
// This code runs on both client and server.

import { type ConductBundle } from "@conduct/ecs";
import { spawnGrid } from "./spawnGrid.js";
import { Grid } from "./grid.js";

export const BUNDLE = {
  SPACE_MARINE: 1,
  TILE: 2,
  STRUCTURE_TILE: 3,
} as const;

export type BundleRegistry = Record<typeof BUNDLE[keyof typeof BUNDLE], ConductBundle>;

export let grid: Grid;

export function startRTS(bundles: BundleRegistry) {
  grid = spawnGrid(bundles[BUNDLE.TILE], bundles[BUNDLE.STRUCTURE_TILE]);
}