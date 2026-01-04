import { Query } from "./core.js";
import { ValueC } from "./basicComponents.js";

export default function BasicSystem(query: Query<[ValueC]>): void {
  query.iter(([_, value]) => {
    value.x += value.y;
  });
}
