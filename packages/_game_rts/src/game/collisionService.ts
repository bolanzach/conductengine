import type { SpatialIndex } from "./spatialIndex.js";

const INITIAL_CAPACITY = 256;
/** Stride for the AABB data array: x, y, z, hx, hy, hz */
const STRIDE = 6;
const UNTRACKED = -Infinity;

/**
 * Standalone collision service. Accepts a SpatialIndex for broad-phase
 * spatial partitioning, then does AABB narrow-phase filtering.
 *
 * Per-entity AABB data is stored in a flat Float64Array indexed by
 * entity ID * STRIDE for cache-friendly access.
 */
export class CollisionService {
  private spatial: SpatialIndex;

  /** Flat array: [x, y, z, hx, hy, hz] per entity, indexed by entity * STRIDE. */
  private data: Float64Array;

  constructor(spatialIndex: SpatialIndex) {
    this.spatial = spatialIndex;
    this.data = new Float64Array(INITIAL_CAPACITY * STRIDE).fill(UNTRACKED);
  }

  private ensureCapacity(entity: number): void {
    const needed = (entity + 1) * STRIDE;
    if (needed <= this.data.length) return;
    let newLen = this.data.length;
    while (newLen < needed) newLen *= 2;
    const next = new Float64Array(newLen).fill(UNTRACKED);
    next.set(this.data);
    this.data = next;
  }

  update(entity: number, x: number, y: number, z: number, hx: number, hy: number, hz: number): void {
    this.ensureCapacity(entity);
    const off = entity * STRIDE;
    this.data[off] = x;
    this.data[off + 1] = y;
    this.data[off + 2] = z;
    this.data[off + 3] = hx;
    this.data[off + 4] = hy;
    this.data[off + 5] = hz;

    this.spatial.update(entity, x, z, hx, hz);
  }

  unregister(entity: number): void {
    if (entity * STRIDE >= this.data.length) return;
    this.data[entity * STRIDE] = UNTRACKED;
    this.spatial.unregister(entity);
  }

  detectAll(): [number, number][] {
    const candidates = this.spatial.broadPhase();
    const results: [number, number][] = [];
    const d = this.data;

    for (let i = 0; i < candidates.length; i++) {
      const a = candidates[i]![0];
      const b = candidates[i]![1];
      const ao = a * STRIDE;
      const bo = b * STRIDE;

      const dx = d[ao]! - d[bo]!;
      const dy = d[ao + 1]! - d[bo + 1]!;
      const dz = d[ao + 2]! - d[bo + 2]!;
      const sx = d[ao + 3]! + d[bo + 3]!;
      const sy = d[ao + 4]! + d[bo + 4]!;
      const sz = d[ao + 5]! + d[bo + 5]!;

      if (
        (dx < 0 ? -dx : dx) < sx &&
        (dy < 0 ? -dy : dy) < sy &&
        (dz < 0 ? -dz : dz) < sz
      ) {
        results.push([a, b]);
      }
    }

    return results;
  }

  detect(entity: number): number[] {
    const off = entity * STRIDE;
    if (off >= this.data.length || this.data[off] === UNTRACKED) return [];
    const d = this.data;

    const x = d[off]!;
    const y = d[off + 1]!;
    const z = d[off + 2]!;
    const hx = d[off + 3]!;
    const hy = d[off + 4]!;
    const hz = d[off + 5]!;

    const results: number[] = [];
    const len = this.data.length;

    for (let o = 0; o < len; o += STRIDE) {
      if (d[o] === UNTRACKED) continue;
      const other = o / STRIDE;
      if (other === entity) continue;

      const dx = x - d[o]!;
      const dy = y - d[o + 1]!;
      const dz = z - d[o + 2]!;
      const sx = hx + d[o + 3]!;
      const sy = hy + d[o + 4]!;
      const sz = hz + d[o + 5]!;

      if (
        (dx < 0 ? -dx : dx) < sx &&
        (dy < 0 ? -dy : dy) < sy &&
        (dz < 0 ? -dz : dz) < sz
      ) {
        results.push(other);
      }
    }

    return results;
  }
}
