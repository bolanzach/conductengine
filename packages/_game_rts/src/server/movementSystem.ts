import type { Query } from "@conduct/ecs";
import { ConductRemoveComponent, deltaTime } from "@conduct/ecs";
import { Transform3D } from "@conduct/simulation";
import { MoveTarget } from "./moveTarget.js";

const MOVE_SPEED = 5;
const ARRIVE_THRESHOLD = 0.1;

export default function MovementSystem(query: Query<[Transform3D, MoveTarget]>) {
  query.iter(([entity, transform, target]) => {
    const dx = target.x - transform.x;
    const dz = target.z - transform.z;
    const dist = Math.sqrt(dx * dx + dz * dz);

    if (dist < ARRIVE_THRESHOLD) {
      ConductRemoveComponent(entity, MoveTarget);
      return;
    }

    const step = Math.min(MOVE_SPEED * deltaTime, dist);
    const nx = dx / dist;
    const nz = dz / dist;

    transform.x = transform.x + nx * step;
    transform.z = transform.z + nz * step;
  });
}