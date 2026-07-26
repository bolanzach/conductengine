import type { Query, Not } from "@conduct/ecs";
import { Transform3D } from "@conduct/simulation";
import { SquadMember } from "../squadMember.js";
import { Squad } from "../squad.js";
import { Path } from "../path.js";

interface Accumulator {
  sumX: number;
  sumZ: number;
  count: number;
}

const accumulators = new Map<number, Accumulator>();

export default function SquadCenterSystem(
  unitQuery: Query<[Transform3D, SquadMember]>,
  squadQuery: Query<[Squad, Transform3D, Not<[Path]>]>,
) {
  accumulators.clear();

  unitQuery.iter(([_entity, transform, member]) => {
    let acc = accumulators.get(member.squadId);
    if (!acc) {
      acc = { sumX: 0, sumZ: 0, count: 0 };
      accumulators.set(member.squadId, acc);
    }
    acc.sumX += transform.x;
    acc.sumZ += transform.z;
    acc.count++;
  });

  for (const [squadId, acc] of accumulators) {
    squadQuery.get(squadId, ([_squad, transform]) => {
      transform.x = acc.sumX / acc.count;
      transform.z = acc.sumZ / acc.count;
    });
  }
}