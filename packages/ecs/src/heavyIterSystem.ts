import { Query } from "./core.js";
import { Position, Velocity } from "./basicComponents.js";

export default function HeavyIterSystem(query: Query<[Position, Velocity]>): void {
  query.iter(([_, p, v]) => {
    p.x += v.x * 0.016;
    p.y += v.y * 0.016 + v.gravity * 0.000128;
    p.z += v.z * 0.016;
    v.x *= 0.999;
    v.y *= 0.999;
    v.z *= 0.999;
    v.y -= v.gravity * 0.016;
  });
}