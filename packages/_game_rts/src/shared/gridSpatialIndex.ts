import type { SpatialIndex } from "./spatialIndex.js";

const INITIAL_CAPACITY = 256;
const NO_CELL = -1;

/**
 * Uniform grid spatial hash for broad-phase collision detection.
 * Cell size aligns with the tile grid (TILE_SIZE = 1 by default).
 *
 * Per-entity data is stored in flat typed arrays indexed by entity ID.
 * Cell buckets use a sparse Map since most cells are unoccupied.
 */
export class GridSpatialIndex implements SpatialIndex {
  private invCellSize: number;

  /** Packed cell key per entity, indexed by entity ID. NO_CELL if untracked. */
  private entityCell: Int32Array;

  /** Entity IDs in each cell (sparse — only occupied cells have entries). */
  private cells: Map<number, number[]> = new Map();

  constructor(cellSize = 1) {
    this.invCellSize = 1 / cellSize;
    this.entityCell = new Int32Array(INITIAL_CAPACITY).fill(NO_CELL);
  }

  private ensureCapacity(entity: number): void {
    if (entity < this.entityCell.length) return;
    let newLen = this.entityCell.length;
    while (newLen <= entity) newLen *= 2;
    const next = new Int32Array(newLen).fill(NO_CELL);
    next.set(this.entityCell);
    this.entityCell = next;
  }

  private packCell(cx: number, cz: number): number {
    // Offset by 512 to support negative coordinates (-512..511 range)
    return ((cz + 512) << 10) | (cx + 512);
  }

  private removeFromCell(entity: number, cellKey: number): void {
    const bucket = this.cells.get(cellKey);
    if (bucket === undefined) return;
    const idx = bucket.indexOf(entity);
    if (idx === -1) return;
    // Swap-remove
    bucket[idx] = bucket[bucket.length - 1]!;
    bucket.pop();
    if (bucket.length === 0) this.cells.delete(cellKey);
  }

  private addToCell(entity: number, cellKey: number): void {
    let bucket = this.cells.get(cellKey);
    if (bucket === undefined) {
      bucket = [];
      this.cells.set(cellKey, bucket);
    }
    bucket.push(entity);
  }

  update(entity: number, x: number, z: number, _hx: number, _hz: number): void {
    this.ensureCapacity(entity);

    const cx = Math.floor(x * this.invCellSize);
    const cz = Math.floor(z * this.invCellSize);
    const newKey = this.packCell(cx, cz);
    const oldKey = this.entityCell[entity]!;

    if (oldKey === newKey) return;

    if (oldKey !== NO_CELL) {
      this.removeFromCell(entity, oldKey);
    }
    this.addToCell(entity, newKey);
    this.entityCell[entity] = newKey;
  }

  unregister(entity: number): void {
    if (entity >= this.entityCell.length) return;
    const cellKey = this.entityCell[entity]!;
    if (cellKey === NO_CELL) return;
    this.removeFromCell(entity, cellKey);
    this.entityCell[entity] = NO_CELL;
  }

  broadPhase(): [number, number][] {
    const pairs: [number, number][] = [];

    for (const [cellKey, bucket] of this.cells) {
      // Intra-cell pairs
      for (let i = 0; i < bucket.length; i++) {
        for (let j = i + 1; j < bucket.length; j++) {
          pairs.push([bucket[i]!, bucket[j]!]);
        }
      }

      // Cross-cell pairs: only check 4 neighbors (right, below, below-right, below-left)
      // to avoid emitting duplicate pairs
      const cx = (cellKey & 0x3ff) - 512;
      const cz = (cellKey >> 10) - 512;

      const neighbors = [
        this.packCell(cx + 1, cz),
        this.packCell(cx, cz + 1),
        this.packCell(cx + 1, cz + 1),
        this.packCell(cx - 1, cz + 1),
      ];

      for (let n = 0; n < 4; n++) {
        const neighbor = this.cells.get(neighbors[n]!);
        if (neighbor === undefined) continue;

        for (let i = 0; i < bucket.length; i++) {
          for (let j = 0; j < neighbor.length; j++) {
            pairs.push([bucket[i]!, neighbor[j]!]);
          }
        }
      }
    }

    return pairs;
  }
}
