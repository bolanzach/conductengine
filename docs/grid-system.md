# Grid / Tile system

Most RTS games use a grid or tile system to manage the game world. This allows for easier pathfinding, collision detection, and overall game logic.

## MVP

We want a simple grid that can manage a 3D world.
The tile position within the grid informs the position of the tile in the 3d world.
The tile data structure should be simple but extensible to add more features later.

```ts
class Grid {
  private tiles: ??? // mentailly we can think of a 3D array to represent the grid in 3D space. However, a flat typed array + a Map keyed by packed coordinates would perform better. You could pack (x, y, z) into a single integer key and use a flat buffer for the tile data.
}

// these are just ideas
const TileType = {
  grass_1: 0,
  dirt_1: 1,
  structure: 2, // a building is on this tile
  resource: 3,  // a resource node is on this tile
}

interface GridTile {
  type: TileType;
  // Additional properties can be added here in the future
}
```

### Tile buffer

Hybrid storage — Keep a Uint8Array for the hot data (tile type), and use a sparse Map<number, TileMetadata> for the rare instance-specific data (like direction)
that only some tiles have. Most tiles won't need extra data, so you avoid paying the cost for all of them.

This hybrid approach is probably the best fit for MVP. The flat array handles the common case efficiently, and the sparse map handles the exceptions without bloating every tile.

### Tile data

The general pattern will be to keep the Tile data structure simple and small. Most things can key off the tile type to know how to render, collision, etc. Only some instance-specific data would be stored on the tile itself, such as the direction of the tile.

The grid does NOT store entities, units, or buildings. It only stores the tile information. This allows for more flexibility and separation of concerns. The entities can reference the grid to know what type of tile they are on, but the grid does not need to know about the entities.
What this may mean is that when an entity moves, it may need to update the tile data if it changes the tile type (e.g. a building being constructed on a tile, a building being destroyed, etc.). However, the grid itself does not need to manage the entities, it just needs to manage the tile data.

### Tile size and grid dimensions

We can play with the Tile sizing but a single Tile can fit a single small building/structure or a few small units (think Age of Empires 2). Larger structures can take up multiple tiles. The total grid size is flexible but for now is something like 64x64 tiles (x, y).
The grid is made up of multiple layers to allow for different heights (z index). In general there will be only a few layers, such as a base layer for the ground and one or two layers for cliffs or elevated terrain.

### Other things

We should be able to easily serialize and deserialize the grid for saving and loading game states. For now JSON works but a custom one may be used in the future.

We also want an easy way to visualize the grid for debugging purposes. This can be done by rendering a simple overlay on top of the game world that shows the grid lines and tile types. This will help us see how the grid is structured and how the tiles are laid out in the 3D world.

## Not in scope

- How does the grid relate to world-space coordinates? What's the tile-to-world transform? This matters for converting between entity positions and grid
 positions.
- Pathfinding. This is handled by a separate system that may consume the grid.
- Tile neighbor relationships.
