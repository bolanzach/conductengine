import { getClientTransport } from "@conduct/networking/clientTransport";
import { getServerId } from "@conduct/networking/clientEntityMap";
import type { GameCommand } from "@conduct/networking/protocol";
import { pushGameCommand } from "../game/commandQueue";

/**
 * Issues a command from the local player.
 * Applies it to the local simulation immediately and sends it to the server.
 */
export function issueCommand(command: GameCommand): void {
  // Apply locally for instant response
  pushGameCommand(command);

  // Translate entity IDs to server IDs and send over the network
  const serverCommand = toServerIds(command);
  if (serverCommand) {
    getClientTransport().send({ type: 'command', payload: serverCommand });
  }
}

function toServerIds(command: GameCommand): GameCommand | null {
  if (command.type === 'move') {
    const data = command.data as { entities: number[]; x: number; z: number };
    const serverEntities: number[] = [];
    for (let i = 0; i < data.entities.length; i++) {
      const serverId = getServerId(data.entities[i]!);
      if (serverId === undefined) return null;
      serverEntities.push(serverId);
    }
    return { ...command, data: { entities: serverEntities, x: data.x, z: data.z } };
  }
  return command;
}