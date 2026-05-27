import { ConductGetComponent, ConductAddComponent, ConductSetComponent } from "@conduct/ecs";
import { consumeCommands } from "@conduct/networking/serverCommandReceive";
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
          const existing = ConductGetComponent(entity, MoveTarget);

          if (existing) {
            ConductSetComponent(entity, MoveTarget, { x: data.x, z: data.z });
          } else {
            ConductAddComponent(entity, MoveTarget, { x: data.x, z: data.z });
          }
        }
        break;
      }
    }
  }
}