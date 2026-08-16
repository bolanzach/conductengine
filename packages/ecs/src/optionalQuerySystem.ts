import { Optional, Query } from "./core.js";
import { Position, Velocity } from "./basicComponents.js";

export default function OptionalQuerySystem(query: Query<[Position, Optional<[Velocity]>]>): void {
  query.iter(([_, p, v]) => {
    if (v) {
      p.x += v.x;
      p.y += v.y;
    } else {
      p.x += 1;
    }
  });
}