import { type ConductBundle, ConductSpawnBundle } from "@conduct/ecs";
import { Transform3D } from "@conduct/simulation";
import { Grid, TileType } from "./grid.js";
import { Tile } from "./tile.js";

const GRID_WIDTH = 64;
const GRID_HEIGHT = 64;
const GRID_LAYERS = 1;
const TILE_SIZE = 1;

/** Creates the grid and spawns a tile entity for each cell. */
export function spawnGrid(tileBundle: ConductBundle): Grid {
  const grid = new Grid({ width: GRID_WIDTH, height: GRID_HEIGHT, layers: GRID_LAYERS });

  // Fill layer 0 with grass for now
  for (let y = 0; y < GRID_HEIGHT; y++) {
    for (let x = 0; x < GRID_WIDTH; x++) {
      grid.set(x, y, 0, TileType.GRASS);

      ConductSpawnBundle([
        ...tileBundle,
        [Transform3D, { x: x * TILE_SIZE, z: y * TILE_SIZE }],
        [Tile, { gridX: x, gridY: y, gridZ: 0 }],
      ]);
    }
  }

  return grid;
}