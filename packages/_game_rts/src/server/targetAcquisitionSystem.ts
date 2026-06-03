import type { Query, Optional } from "@conduct/ecs";
import { ConductAddComponent } from "@conduct/ecs";
import { Transform3D } from "@conduct/simulation";
import { Networked } from "@conduct/networking/networked";
import { SquadMember } from "../shared/squadMember.js";
import { Path } from "./path.js";
import { AttackTarget } from "./attackTarget.js";

const ATTACK_RANGE = 5;
const ATTACK_RANGE_SQ = ATTACK_RANGE * ATTACK_RANGE;

// --- Per-unit record, reused each tick ---

interface UnitRecord {
  id: number;
  x: number;
  z: number;
  owner: number;
}

// Pre-allocated arrays for enemy positions, indexed by 0=human 1=AI
const teamUnits: UnitRecord[][] = [[], []];

// Per-squad tracking
interface SquadInfo {
  members: UnitRecord[];
  hasAttackTarget: boolean;
  hasIdleMember: boolean;
  owner: number;
}
const squads = new Map<number, SquadInfo>();

function teamIndex(owner: number): number {
  return owner > 0 ? 0 : 1;
}

function clearState(): void {
  teamUnits[0]!.length = 0;
  teamUnits[1]!.length = 0;
  squads.clear();
}

export default function TargetAcquisitionSystem(
  query: Query<[Transform3D, Networked, SquadMember, Optional<[Path, AttackTarget]>]>
): void {
  clearState();

  // Phase 1: build lookup tables
  query.iter(([entity, transform, networked, member, path, attackTarget]) => {
    const record: UnitRecord = {
      id: entity,
      x: transform.x,
      z: transform.z,
      owner: networked.owner,
    };

    // Track all units by team for enemy lookup
    teamUnits[teamIndex(networked.owner)]!.push(record);

    // Track squad membership
    let squad = squads.get(member.squadId);
    if (!squad) {
      squad = { members: [], hasAttackTarget: false, hasIdleMember: false, owner: networked.owner };
      squads.set(member.squadId, squad);
    }
    squad.members.push(record);

    if (attackTarget) {
      squad.hasAttackTarget = true;
    } else if (!path) {
      squad.hasIdleMember = true;
    }
  });

  // Phase 2: for each eligible squad, find nearest enemy
  for (const [_squadId, squad] of squads) {
    // Eligible: at least one idle member AND no members already attacking
    if (!squad.hasIdleMember || squad.hasAttackTarget) continue;

    // Compute center from idle members
    let cx = 0;
    let cz = 0;
    let idleCount = 0;
    const members = squad.members;

    for (let i = 0; i < members.length; i++) {
      // Idle members are those without Path or AttackTarget — we can approximate
      // by using all members since we know none have AttackTarget
      cx += members[i]!.x;
      cz += members[i]!.z;
      idleCount++;
    }

    cx /= idleCount;
    cz /= idleCount;

    // Find closest enemy within range
    const enemyTeam = teamIndex(squad.owner) === 0 ? 1 : 0;
    const enemies = teamUnits[enemyTeam]!;

    let bestTarget = -1;
    let bestDistSq = ATTACK_RANGE_SQ;

    for (let i = 0; i < enemies.length; i++) {
      const enemy = enemies[i]!;
      const dx = enemy.x - cx;
      const dz = enemy.z - cz;
      const distSq = dx * dx + dz * dz;

      if (distSq < bestDistSq) {
        bestDistSq = distSq;
        bestTarget = enemy.id;
      }
    }

    if (bestTarget === -1) continue;

    console.log(`[target] squad ${_squadId} acquired target entity ${bestTarget}`);

    // Assign AttackTarget to ALL squad members (including those still moving)
    for (let i = 0; i < members.length; i++) {
      ConductAddComponent(members[i]!.id, AttackTarget, { target: bestTarget });
    }
  }
}