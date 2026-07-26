import type { GameCommand } from "@conduct/networking/protocol";

let commandBuffer: GameCommand[] = [];

export function pushGameCommand(command: GameCommand): void {
  commandBuffer.push(command);
}

export function consumeGameCommands(): GameCommand[] {
  if (commandBuffer.length === 0) return commandBuffer;
  const commands = commandBuffer;
  commandBuffer = [];
  return commands;
}