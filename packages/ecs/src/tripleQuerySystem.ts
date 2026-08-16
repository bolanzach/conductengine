import { Query } from "./core.js";
import { Position, Velocity, Health } from "./basicComponents.js";

export default function TripleQuerySystem(query: Query<[Position, Velocity, Health]>): void {
  query.iter(([_, p, v, h]) => {
    p.x += v.x;
    p.y += v.y;
    p.z += v.z;
    v.y -= v.gravity * 0.016;
    h.hp -= 0.01;
    if (h.hp < 0) h.hp = h.maxHp;
  });
}