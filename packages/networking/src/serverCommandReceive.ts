import type { GameCommand } from "./protocol.js";

let commandBuffer: GameCommand[] = [];

export function pushCommand(command: GameCommand): void {
  commandBuffer.push(command);
}

export function consumeCommands(): GameCommand[] {
  if (commandBuffer.length === 0) return commandBuffer;
  const commands = commandBuffer;
  commandBuffer = [];
  return commands;
}
