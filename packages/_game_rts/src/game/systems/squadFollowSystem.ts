import type { Query } from "@conduct/ecs";
import { Transform3D } from "@conduct/simulation";
import { SquadMember } from "../squadMember.js";
import { Squad } from "../squad.js";
import { SteerTarget } from "../steerTarget.js";

export default function SquadFollowSystem(
  unitQuery: Query<[SteerTarget, SquadMember]>,
  squadQuery: Query<[Squad, Transform3D]>,
) {
  unitQuery.iter(([_entity, steerTarget, member]) => {
    squadQuery.get(member.squadId, ([_squad, squadTransform]) => {
      steerTarget.x = squadTransform.x;
      steerTarget.z = squadTransform.z;
    });
  });
}