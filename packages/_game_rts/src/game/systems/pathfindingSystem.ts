import type { Query } from "@conduct/ecs";
import { ConductRemoveComponent, deltaTime } from "@conduct/ecs";
import { Transform3D } from "@conduct/simulation";
import { Squad } from "../squad.js";
import { Path } from "../path.js";

const MOVE_SPEED = 2.0;
const ARRIVE_THRESHOLD = 0.1;

export default function PathfindingSystem(query: Query<[Squad, Transform3D, Path]>) {
  query.iter(([entity, _squad, transform, path]) => {
    if (path.current >= path.waypoints.length) {
      ConductRemoveComponent(entity, Path);
      return;
    }

    const wp = path.waypoints[path.current]!;
    const dx = wp.x - transform.x;
    const dz = wp.y - transform.z;
    const dist = Math.sqrt(dx * dx + dz * dz);

    if (dist < ARRIVE_THRESHOLD) {
      path.current = path.current + 1;
      return;
    }

    const step = Math.min(MOVE_SPEED * deltaTime, dist);
    const nx = dx / dist;
    const nz = dz / dist;

    transform.x = transform.x + nx * step;
    transform.z = transform.z + nz * step;
  });
}