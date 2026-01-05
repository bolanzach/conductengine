import { Query } from "./core.js";
import { ValueB } from "./basicComponents.js";

export default function FooSystem(query: Query<[ValueB]>): void {
  query.iter(([_, value]) => {
    value.x += value.y;
  });
}
