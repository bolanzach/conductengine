import { ConductEntity, Query } from "./core.js";
import { ValueA } from "./basicComponents.js";

const MAX_ENTITY = 5_000;

export default function GetLookupSystem(query: Query<[ValueA]>): void {
  const id = ((Math.random() * MAX_ENTITY) | 0) as ConductEntity;
  query.get(id, ([value]) => {
    value.x += 1;
  });
}