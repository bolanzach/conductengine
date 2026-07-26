import { ConductGetComponent, ConductAddComponent, ConductRemoveComponent } from "@conduct/ecs";
import { Networked } from "@conduct/networking/networked";
import { Transform3D } from "@conduct/simulation";
import { Path } from "../path.js";
import { SquadTarget } from "../squadTarget.js";
import { findPath } from "../pathfinding.js";
import { grid } from "../index.js";
import { Squad } from "../squad.js";
import { consumeGameCommands } from "../commandQueue.js";

export default function CommandSystem() {
  const commands = consumeGameCommands();

  for (let i = 0; i < commands.length; i++) {
    const command = commands[i]!;

    switch (command.type) {
      case 'move': {
        const data = command.data as { entities: number[]; x: number; z: number };

        for (let j = 0; j < data.entities.length; j++) {
          const entity = data.entities[j]!;

          const networked = ConductGetComponent(entity, Networked);
          if (!networked || networked.owner !== command.playerId) continue;

          const squad = ConductGetComponent(entity, Squad);
          if (squad) {
            assignSquadPath(entity, data.x, data.z);
          }
        }
      }
    }
  }
}

function assignSquadPath(squadEntity: number, destX: number, destZ: number) {
  const transform = ConductGetComponent(squadEntity, Transform3D);
  if (!transform) return;

  // Cancel any active engagement
  ConductRemoveComponent(squadEntity, SquadTarget);

  const startGX = Math.round(transform.x);
  const startGY = Math.round(transform.z);
  const endGX = Math.round(destX);
  const endGY = Math.round(destZ);

  const waypoints = findPath(grid, startGX, startGY, endGX, endGY);
  if (!waypoints) {
    console.log('No path found for squad', squadEntity);
    return;
  }

  ConductAddComponent(squadEntity, Path, { waypoints, current: 0 });
}