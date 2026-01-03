import { Query } from "./core.js";
import { ValueA } from "./basicComponents.js";

export default function BasicSystem(query: Query<[ValueA]>): void {
  query.iter(([_, value]) => {
    value.x += value.y;
  });
}
