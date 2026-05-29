import type { Query, Optional } from "@conduct/ecs";
import { ConductRemoveComponent, deltaTime } from "@conduct/ecs";
import { Transform3D } from "@conduct/simulation";
import { MoveTarget } from "./moveTarget.js";
import { FormationOffset } from "./formationOffset.js";

const MOVE_SPEED = 5;
const ARRIVE_THRESHOLD = 0.1;

export default function MovementSystem(query: Query<[Transform3D, MoveTarget, Optional<[FormationOffset]>]>) {
  query.iter(([entity, transform, target, offset]) => {
    const tx = target.x + (offset ? offset.x : 0);
    const tz = target.z + (offset ? offset.z : 0);

    const dx = tx - transform.x;
    const dz = tz - transform.z;
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