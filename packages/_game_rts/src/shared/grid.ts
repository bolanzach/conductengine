/**
 * Tile types stored in the flat buffer. Max 255 (Uint8Array).
 */
export const TileType = {
  EMPTY: 0,
  GRASS: 1,
  DIRT: 2,
  STRUCTURE: 3,
  RESOURCE: 4,
} as const;

export type TileType = (typeof TileType)[keyof typeof TileType];

/**
 * Instance-specific metadata, only stored for tiles that need it.
 */
export interface TileMetadata {}

export interface GridOptions {
  width: number;
  height: number;
  layers: number;
}

/**
 * Pack (x, y, z) into a single integer for use as a Map key.
 */
export function packCoord(x: number, y: number, z: number): number {
  return (z << 20) | (y << 10) | x;
}

/**
 * Hybrid grid storage.
 * - Uint8Array for hot tile type data (indexed by z * w*h + y * w + x)
 * - Sparse Map<number, TileMetadata> for cold per-tile instance data
 */
export class Grid {
  readonly width: number;
  readonly height: number;
  readonly layers: number;

  private tiles: Uint8Array;
  private metadata: Map<number, TileMetadata>;

  constructor(options: GridOptions) {
    this.width = options.width;
    this.height = options.height;
    this.layers = options.layers;
    this.tiles = new Uint8Array(options.width * options.height * options.layers);
    this.metadata = new Map();
  }

  private index(x: number, y: number, z: number): number {
    return z * (this.width * this.height) + y * this.width + x;
  }

  inBounds(x: number, y: number, z: number): boolean {
    return x >= 0 && x < this.width && y >= 0 && y < this.height && z >= 0 && z < this.layers;
  }

  get(x: number, y: number, z: number): TileType {
    if (!this.inBounds(x, y, z)) return TileType.EMPTY;
    return this.tiles[this.index(x, y, z)] as TileType;
  }

  set(x: number, y: number, z: number, type: TileType): void {
    if (!this.inBounds(x, y, z)) return;
    this.tiles[this.index(x, y, z)] = type;
  }

  getMeta(x: number, y: number, z: number): TileMetadata | undefined {
    return this.metadata.get(packCoord(x, y, z));
  }

  setMeta(x: number, y: number, z: number, meta: TileMetadata): void {
    this.metadata.set(packCoord(x, y, z), meta);
  }

  removeMeta(x: number, y: number, z: number): void {
    this.metadata.delete(packCoord(x, y, z));
  }
}