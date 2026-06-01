import { ConductGetComponent, ConductAddComponent } from "@conduct/ecs";
import { consumeCommands } from "@conduct/networking/serverCommandReceive";
import { Networked } from "@conduct/networking/networked";
import { Transform3D } from "@conduct/simulation";
import { Path } from "./path.js";
import { SquadMember } from "../shared/squadMember.js";
import { findPath } from "../shared/pathfinding.js";
import { grid } from "../shared/index.js";

const SQUAD_SPACING = 2.0;

let nextSoloGroup = -1;

export default function CommandSystem() {
  const commands = consumeCommands();

  for (let i = 0; i < commands.length; i++) {
    const command = commands[i]!;

    switch (command.type) {
      case 'move': {
        const data = command.data as { entities: number[]; x: number; z: number };

        // First pass: validate ownership and group entities by squad
        const squadGroups = new Map<number, number[]>();

        for (let j = 0; j < data.entities.length; j++) {
          const entity = data.entities[j]!;

          const networked = ConductGetComponent(entity, Networked);
          if (!networked || networked.owner !== command.playerId) continue;

          const member = ConductGetComponent(entity, SquadMember);
          const groupId = member ? member.squadId : nextSoloGroup--;

          let group = squadGroups.get(groupId);
          if (!group) {
            group = [];
            squadGroups.set(groupId, group);
          }
          group.push(entity);
        }

        // Compute per-squad spread offsets and assign paths
        const squadCount = squadGroups.size;

        if (squadCount <= 1) {
          squadGroups.forEach((entities) => {
            for (let j = 0; j < entities.length; j++) {
              assignPath(entities[j]!, data.x, data.z);
            }
          });
        } else {
          const cols = Math.ceil(Math.sqrt(squadCount));
          const rows = Math.ceil(squadCount / cols);
          const originX = data.x - ((cols - 1) * SQUAD_SPACING) / 2;
          const originZ = data.z - ((rows - 1) * SQUAD_SPACING) / 2;

          let idx = 0;
          squadGroups.forEach((entities) => {
            const col = idx % cols;
            const row = Math.floor(idx / cols);
            const tx = originX + col * SQUAD_SPACING;
            const tz = originZ + row * SQUAD_SPACING;

            for (let j = 0; j < entities.length; j++) {
              assignPath(entities[j]!, tx, tz);
            }
            idx++;
          });
        }

        break;
      }
    }
  }
}

function assignPath(entity: number, destX: number, destZ: number) {
  const transform = ConductGetComponent(entity, Transform3D);
  if (!transform) return;

  const startGX = Math.round(transform.x);
  const startGY = Math.round(transform.z);
  const endGX = Math.round(destX);
  const endGY = Math.round(destZ);

  const waypoints = findPath(grid, startGX, startGY, endGX, endGY);
  if (!waypoints) {
    console.log('No path found for entity', entity);
    return;
  }

  ConductAddComponent(entity, Path, { waypoints, current: 0 });
}