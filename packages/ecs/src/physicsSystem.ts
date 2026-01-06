import { Query } from "./core.js";
import { Position, Velocity } from "./basicComponents.js";

export default function PhysicsSystem(query: Query<[Position, Velocity]>): void {
  query.iter(([_, p, v]) => {
    p.x += v.x;
    p.y += v.y;
    p.z += v.z;

    // Simple gravity effect
    v.y -= v.gravity * 0.016; // Assuming 60 FPS, so ~16ms per frame

    console.log(p.x, p.y, p.z);
  });
}
