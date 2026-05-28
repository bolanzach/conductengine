import type { NetworkMessage } from "./protocol.js";
import type { NetworkTransport } from "./transport.js";

let transport: NetworkTransport | null = null;

export function getClientTransport(): NetworkTransport {
  return transport!;
}

export function setClientTransport(t: NetworkTransport): void {
  transport = t;
}

export class WebSocketClientTransport implements NetworkTransport {
  private ws: WebSocket;
  private messageHandler: ((message: NetworkMessage) => void) | null = null;
  private connectHandler: (() => void) | null = null;
  private disconnectHandler: (() => void) | null = null;

  constructor(url: string) {
    this.ws = new WebSocket(url);

    this.ws.addEventListener('open', () => {
      this.connectHandler?.();
    });

    this.ws.addEventListener('message', (event: MessageEvent) => {
      const message = JSON.parse(event.data as string) as NetworkMessage;
      this.messageHandler?.(message);
    });

    this.ws.addEventListener('close', () => {
      this.disconnectHandler?.();
    });
  }

  send(message: NetworkMessage): void {
    if (this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(message));
    }
  }

  onMessage(handler: (message: NetworkMessage) => void): void {
    this.messageHandler = handler;
  }

  onConnect(handler: () => void): void {
    this.connectHandler = handler;
  }

  onDisconnect(handler: () => void): void {
    this.disconnectHandler = handler;
  }

  disconnect(): void {
    this.ws.close();
  }
}
