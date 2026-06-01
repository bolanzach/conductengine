import type { PathNode } from "../shared/pathfinding.js";

export class Path {
  waypoints: PathNode[] = [];
  current = 0;
}