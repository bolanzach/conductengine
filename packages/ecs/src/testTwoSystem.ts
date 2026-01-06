import { Not, Query } from "./core.js";
import { ValueA, ValueB, ValueE } from "./basicComponents.js";

export default function TestTwoSystem(query: Query<[ValueA, Not<[ValueE]>, ValueB]>): void {
  query.iter(([_, a, b]) => {
    a.x += b.x;
    a.y += b.y;
  });
}
