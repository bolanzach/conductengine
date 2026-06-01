import { Grid, TileType } from "./grid.js";

export interface PathNode {
  x: number;
  y: number;
}

const BLOCKED_TYPES: Set<TileType> = new Set([TileType.STRUCTURE]);

function isWalkable(grid: Grid, x: number, y: number): boolean {
  if (!grid.inBounds(x, y, 0)) return false;
  return !BLOCKED_TYPES.has(grid.get(x, y, 0));
}

function heuristic(ax: number, ay: number, bx: number, by: number): number {
  return Math.abs(ax - bx) + Math.abs(ay - by);
}

function packXY(x: number, y: number, minX: number, minY: number): number {
  return ((y - minY) << 16) | (x - minX);
}

function unpackX(key: number, minX: number): number {
  return (key & 0xFFFF) + minX;
}

function unpackY(key: number, minY: number): number {
  return (key >>> 16) + minY;
}

const NEIGHBORS = [
  [1, 0],
  [-1, 0],
  [0, 1],
  [0, -1],
] as const;

/**
 * A* pathfinding on grid layer 0.
 * Returns an array of grid coordinates from start to end (inclusive), or null if unreachable.
 */
export function findPath(grid: Grid, startX: number, startY: number, endX: number, endY: number): PathNode[] | null {
  if (!isWalkable(grid, startX, startY) || !isWalkable(grid, endX, endY)) return null;
  if (startX === endX && startY === endY) return [{ x: startX, y: startY }];

  const gScore = new Map<number, number>();
  const cameFrom = new Map<number, number>();

  const { minX, minY } = grid;
  const startKey = packXY(startX, startY, minX, minY);
  const endKey = packXY(endX, endY, minX, minY);

  gScore.set(startKey, 0);

  // Simple binary heap would be better, but a sorted open set works for MVP
  const open: { key: number; x: number; y: number; f: number }[] = [];
  open.push({ key: startKey, x: startX, y: startY, f: heuristic(startX, startY, endX, endY) });

  while (open.length > 0) {
    // Find lowest f-score in open set
    let bestIdx = 0;
    for (let i = 1; i < open.length; i++) {
      if (open[i]!.f < open[bestIdx]!.f) bestIdx = i;
    }
    const current = open[bestIdx]!;
    open[bestIdx] = open[open.length - 1]!;
    open.pop();

    if (current.key === endKey) {
      // Reconstruct path
      const path: PathNode[] = [];
      let key = endKey;
      while (key !== startKey) {
        path.push({ x: unpackX(key, minX), y: unpackY(key, minY) });
        key = cameFrom.get(key)!;
      }
      path.push({ x: startX, y: startY });
      path.reverse();
      return path;
    }

    const currentG = gScore.get(current.key)!;

    for (let i = 0; i < NEIGHBORS.length; i++) {
      const nx = current.x + NEIGHBORS[i]![0];
      const ny = current.y + NEIGHBORS[i]![1];

      if (!isWalkable(grid, nx, ny)) continue;

      const neighborKey = packXY(nx, ny, minX, minY);
      const tentativeG = currentG + 1;

      const existingG = gScore.get(neighborKey);
      if (existingG !== undefined && tentativeG >= existingG) continue;

      gScore.set(neighborKey, tentativeG);
      cameFrom.set(neighborKey, current.key);

      const f = tentativeG + heuristic(nx, ny, endX, endY);
      open.push({ key: neighborKey, x: nx, y: ny, f });
    }
  }

  return null;
}