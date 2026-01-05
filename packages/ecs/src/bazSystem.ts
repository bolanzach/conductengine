import { Query } from "./core.js";
import { ValueD } from "./basicComponents.js";

export default function BazSystem(query: Query<[ValueD]>): void {
  query.iter(([_, value]) => {
    value.x += value.y;
  });
}
