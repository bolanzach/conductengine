import type { Query } from "@conduct/ecs";
import { deltaTime } from "@conduct/ecs";
import { Transform3D } from "@conduct/simulation";
import { SquadMember } from "../shared/squadMember.js";
import { Squad } from "../shared/squad.js";
import { FormationOffset } from "./formationOffset.js";

const MOVE_SPEED = 5;
const ARRIVE_THRESHOLD = 0.05;

export default function MovementSystem(
  unitQuery: Query<[Transform3D, SquadMember, FormationOffset]>,
  squadQuery: Query<[Squad, Transform3D]>,
) {
  unitQuery.iter(([_entity, transform, member, offset]) => {
    squadQuery.get(member.squadId, ([_squad, squadTransform]) => {
      const tx = squadTransform.x + offset.x;
      const tz = squadTransform.z + offset.z;

      const dx = tx - transform.x;
      const dz = tz - transform.z;
      const dist = Math.sqrt(dx * dx + dz * dz);

      if (dist < ARRIVE_THRESHOLD) return;

      const step = Math.min(MOVE_SPEED * deltaTime, dist);
      const nx = dx / dist;
      const nz = dz / dist;

      transform.x = transform.x + nx * step;
      transform.z = transform.z + nz * step;
    });
  });
}