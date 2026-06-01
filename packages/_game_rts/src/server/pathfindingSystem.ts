import type { Query, Optional } from "@conduct/ecs";
import { ConductRemoveComponent, deltaTime } from "@conduct/ecs";
import { Transform3D } from "@conduct/simulation";
import { FormationOffset } from "./formationOffset.js";
import { Path } from "./path.js";

const MOVE_SPEED = 2.0;
const ARRIVE_THRESHOLD = 0.1;

export default function PathfindingSystem(query: Query<[Transform3D, Path, Optional<[FormationOffset]>]>) {
  query.iter(([entity, transform, path, offset]) => {
    if (path.current >= path.waypoints.length) {
      ConductRemoveComponent(entity, Path);
      return;
    }

    const wp = path.waypoints[path.current]!;
    const tx = wp.x + (offset ? offset.x : 0);
    const tz = wp.y + (offset ? offset.z : 0);

    const dx = tx - transform.x;
    const dz = tz - transform.z;
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