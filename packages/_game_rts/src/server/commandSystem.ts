import { ConductGetComponent, ConductAddComponent } from "@conduct/ecs";
import { consumeCommands } from "@conduct/networking/serverCommandReceive";
import { Networked } from "@conduct/networking/networked";
import { MoveTarget } from "./moveTarget.js";

export default function CommandSystem() {
  const commands = consumeCommands();

  for (let i = 0; i < commands.length; i++) {
    const command = commands[i]!;

    switch (command.type) {
      case 'move': {
        const data = command.data as { entities: number[]; x: number; z: number };

        for (let j = 0; j < data.entities.length; j++) {
          const entity = data.entities[j]!;

          // Validate that the player owns this entity
          const networked = ConductGetComponent(entity, Networked);
          if (!networked || networked.owner !== command.playerId) continue;

          ConductAddComponent(entity, MoveTarget, { x: data.x, z: data.z });
        }
        break;
      }
    }
  }
}