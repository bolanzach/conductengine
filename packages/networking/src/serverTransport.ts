import { WebSocketServer, WebSocket } from "ws";
import type { NetworkMessage } from "./protocol.js";

let transport: WebSocketServerTransport | null = null;

export function getServerTransport(): WebSocketServerTransport | null {
  return transport;
}

export function setServerTransport(t: WebSocketServerTransport): void {
  transport = t;
}

interface ClientConnection {
  playerId: number;
  ws: WebSocket;
}

export class WebSocketServerTransport {
  private wss: WebSocketServer;
  private clients: ClientConnection[] = [];
  private nextPlayerId = 1;

  private connectionHandler: ((playerId: number) => void) | null = null;
  private messageHandler: ((playerId: number, message: NetworkMessage) => void) | null = null;
  private disconnectHandler: ((playerId: number) => void) | null = null;

  constructor(port: number) {
    this.wss = new WebSocketServer({ port });

    this.wss.on('connection', (ws) => {
      const playerId = this.nextPlayerId++;
      const client: ClientConnection = { playerId, ws };
      this.clients.push(client);

      this.connectionHandler?.(playerId);

      ws.on('message', (data) => {
        const message = JSON.parse(data.toString()) as NetworkMessage;
        this.messageHandler?.(playerId, message);
      });

      ws.on('close', () => {
        this.clients = this.clients.filter(c => c.playerId !== playerId);
        this.disconnectHandler?.(playerId);
      });
    });
  }

  broadcast(message: NetworkMessage): void {
    const json = JSON.stringify(message);
    for (const client of this.clients) {
      if (client.ws.readyState === WebSocket.OPEN) {
        client.ws.send(json);
      }
    }
  }

  sendTo(playerId: number, message: NetworkMessage): void {
    const client = this.clients.find(c => c.playerId === playerId);
    if (client && client.ws.readyState === WebSocket.OPEN) {
      client.ws.send(JSON.stringify(message));
    }
  }

  onConnection(handler: (playerId: number) => void): void {
    this.connectionHandler = handler;
  }

  onMessage(handler: (playerId: number, message: NetworkMessage) => void): void {
    this.messageHandler = handler;
  }

  onDisconnect(handler: (playerId: number) => void): void {
    this.disconnectHandler = handler;
  }
}