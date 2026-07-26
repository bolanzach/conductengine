import type { PathNode } from "./pathfinding.js";

export class Path {
  waypoints: PathNode[] = [];
  current = 0;
}