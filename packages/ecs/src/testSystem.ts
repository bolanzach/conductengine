import { Query } from "./core.js";
import { ValueE } from "./basicComponents.js";

export default function TestSystem(query: Query<[ValueE]>): void {
  query.iter(([_, value]) => {
    value.x += value.y;
  });
}
