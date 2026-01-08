import { Not, Query } from "./core.js";
import { ValueA, ValueB, ValueE } from "./basicComponents.js";

export default function EarlyReturnSystem(query: Query<[ValueA, Not<[ValueE]>, ValueB]>): void {
  query.iter(([_, a, b]) => {
    if (a.x > 2) {
      return;
    }

    a.x += b.x;
    a.y += b.y;
  });
}
