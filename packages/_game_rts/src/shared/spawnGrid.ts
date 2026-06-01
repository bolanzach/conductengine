import { type ConductBundle, ConductSpawnBundle } from "@conduct/ecs";
import { Transform3D } from "@conduct/simulation";
import { Grid, TileType } from "./grid.js";
import { Tile } from "./tile.js";

const GRID_WIDTH = 10;
const GRID_HEIGHT = 10;
const GRID_LAYERS = 3;

// Simple seeded PRNG so client and server generate identical grids
let seed = 12345;
function seededRandom(): number {
  seed = (seed * 16807 + 0) % 2147483647;
  return seed / 2147483647;
}

/** Creates the grid and spawns a tile entity for each cell. */
export function spawnGrid(tileBundle: ConductBundle, structureBundle: ConductBundle): Grid {
  const grid = new Grid({ width: GRID_WIDTH, height: GRID_HEIGHT, layers: GRID_LAYERS });

  // Fill layer 0 with grass, scatter some structures for testing
  for (let y = grid.minY; y < grid.maxY; y++) {
    for (let x = grid.minX; x < grid.maxX; x++) {
      const type = seededRandom() < 0.15 ? TileType.STRUCTURE : TileType.GRASS;
      // const type = TileType.GRASS;

      grid.set(x, y, 0, type);

      const bundle = type === TileType.STRUCTURE ? structureBundle : tileBundle;
      // const bundle = tileBundle;

      ConductSpawnBundle([
        ...bundle,
        [Transform3D, { x, z: y }],
        [Tile, { gridX: x, gridY: y, gridZ: 0 }],
      ]);
    }
  }

  return grid;
}