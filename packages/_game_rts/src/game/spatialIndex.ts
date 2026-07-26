export interface SpatialIndex {
  /** Insert or update an entity's position and half-extents (2D, top-down). */
  update(entity: number, x: number, z: number, hx: number, hz: number): void;

  /** Remove an entity from the index. */
  unregister(entity: number): void;

  /** Return candidate collision pairs from the broad phase. */
  broadPhase(): [number, number][];
}