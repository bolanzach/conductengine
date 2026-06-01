import type { Query, Optional } from "@conduct/ecs";
import { ConductRemoveComponent, deltaTime } from "@conduct/ecs";
import { Transform3D } from "@conduct/simulation";
import { MoveTarget } from "./moveTarget.js";
import { FormationOffset } from "./formationOffset.js";
import { Path } from "./path.js";

const MOVE_SPEED = 5;
const ARRIVE_THRESHOLD = 0.1;

export default function MovementSystem(query: Query<[Transform3D, MoveTarget, Optional<[FormationOffset, Path]>]>) {
  query.iter(([entity, transform, target, offset, path]) => {
    let tx: number;
    let tz: number;

    if (path && path.current < path.waypoints.length) {
      const wp = path.waypoints[path.current]!;
      tx = wp.x + (offset ? offset.x : 0);
      tz = wp.y + (offset ? offset.z : 0);
    } else {
      tx = target.x + (offset ? offset.x : 0);
      tz = target.z + (offset ? offset.z : 0);
    }

    const dx = tx - transform.x;
    const dz = tz - transform.z;
    const dist = Math.sqrt(dx * dx + dz * dz);

    if (dist < ARRIVE_THRESHOLD) {
      if (path && path.current < path.waypoints.length) {
        path.current = path.current + 1;
        return;
      }
      ConductRemoveComponent(entity, MoveTarget);
      if (path) ConductRemoveComponent(entity, Path);
      return;
    }

    const step = Math.min(MOVE_SPEED * deltaTime, dist);
    const nx = dx / dist;
    const nz = dz / dist;

    transform.x = transform.x + nx * step;
    transform.z = transform.z + nz * step;
  });
}