import type { ToServerMessage, ToClientMessage } from "./protocol.js";

let transport: WebSocketClientTransport | null = null;

export function getClientTransport(): WebSocketClientTransport {
  return transport!;
}

export function setClientTransport(t: WebSocketClientTransport): void {
  transport = t;
}

export class WebSocketClientTransport {
  private ws: WebSocket;
  private messageHandler: ((message: ToClientMessage) => void) | null = null;
  private connectHandler: (() => void) | null = null;
  private disconnectHandler: (() => void) | null = null;

  constructor(url: string) {
    this.ws = new WebSocket(url);

    this.ws.addEventListener('open', () => {
      this.connectHandler?.();
    });

    this.ws.addEventListener('message', (event: MessageEvent) => {
      const message = JSON.parse(event.data as string) as ToClientMessage;
      this.messageHandler?.(message);
    });

    this.ws.addEventListener('close', () => {
      this.disconnectHandler?.();
    });
  }

  send(message: ToServerMessage): void {
    if (this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(message));
    }
  }

  onMessage(handler: (message: ToClientMessage) => void): void {
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