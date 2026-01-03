import { Query } from "./core.js";
import { ValueB } from "./basicComponents.js";

export default function BasicSystem(query: Query<[ValueB]>): void {
  query.iter(([_, value]) => {
    value.x += value.y;
  });
}
