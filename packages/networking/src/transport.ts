import type { NetworkMessage } from "./protocol.js";

export interface NetworkTransport {
  send(message: NetworkMessage): void;
  onMessage(handler: (message: NetworkMessage) => void): void;
  onConnect(handler: () => void): void;
  onDisconnect(handler: () => void): void;
  disconnect(): void;
}