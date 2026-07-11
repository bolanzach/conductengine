import type { Query, Optional } from "@conduct/ecs";
import { ConductAddComponent } from "@conduct/ecs";
import { Transform3D } from "@conduct/simulation";
import { Networked } from "@conduct/networking/networked";
import { Squad } from "../shared/squad.js";
import { SquadTarget } from "./squadTarget.js";

const ATTACK_RANGE = 5;
const ATTACK_RANGE_SQ = ATTACK_RANGE * ATTACK_RANGE;

interface SquadRecord {
  id: number;
  x: number;
  z: number;
  needsTarget: boolean;
}

// Pre-allocated arrays per team, indexed by 0=human 1=AI
const teamSquads: SquadRecord[][] = [[], []];

function teamIndex(owner: number): number {
  return owner > 0 ? 0 : 1;
}

export default function TargetAcquisitionSystem(
  query: Query<[Squad, Transform3D, Networked, Optional<[SquadTarget]>]>,
) {
  teamSquads[0]!.length = 0;
  teamSquads[1]!.length = 0;

  query.iter(([entity, _squad, transform, networked, squadTarget]) => {
    teamSquads[teamIndex(networked.owner)]!.push({
      id: entity,
      x: transform.x,
      z: transform.z,
      needsTarget: !squadTarget,
    });
  });

  for (let t = 0; t < 2; t++) {
    const squads = teamSquads[t]!;
    const enemies = teamSquads[t === 0 ? 1 : 0]!;

    for (let i = 0; i < squads.length; i++) {
      const squad = squads[i]!;
      if (!squad.needsTarget) continue;

      let bestTarget = -1;
      let bestDistSq = ATTACK_RANGE_SQ;

      for (let j = 0; j < enemies.length; j++) {
        const enemy = enemies[j]!;
        const dx = enemy.x - squad.x;
        const dz = enemy.z - squad.z;
        const distSq = dx * dx + dz * dz;

        if (distSq < bestDistSq) {
          bestDistSq = distSq;
          bestTarget = enemy.id;
        }
      }

      if (bestTarget !== -1) {
        ConductAddComponent(squad.id, SquadTarget, { target: bestTarget });
      }
    }
  }
}