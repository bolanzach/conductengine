import type { GameCommand } from "./protocol.js";

let commandQueue: GameCommand[] = [];

export function queueClientCommand(command: GameCommand): void {
  commandQueue.push(command);
}

export function consumeClientCommandQueue(): GameCommand[] {
  if (commandQueue.length === 0) return commandQueue;
  const commands = commandQueue;
  commandQueue = [];
  return commands;
}