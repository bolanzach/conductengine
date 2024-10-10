import {
  NetworkTransport,
  TransportEvent,
} from '../conduct-core/networkTransport';

class ClientWebsocketTransport implements NetworkTransport {
  private ws: WebSocket;
  private networkIds: number[] = [];

  constructor() {
    this.ws = new WebSocket('ws://localhost:4242');

    this.ws.addEventListener('open', () => {
      console.log('Connected to the server');
    });
  }

  get readyState() {
    return this.ws.readyState;
  }

  produceNetworkEvent(message: TransportEvent) {
    this.ws.send(JSON.stringify(message));
  }

  registerNetworkHandler(cb: (message: TransportEvent) => void) {
    this.ws.addEventListener('message', async (event) => {
      const txt = await event.data.text();
      cb(JSON.parse(txt));
    });
  }

  generateNetworkId(): number {
    // Client cannot generate network ids
    return Infinity;
  }

  setNetworked(id: number) {
    this.networkIds.push(id);
  }

  isNetworked(id: number): boolean {
    return this.networkIds.includes(id);
  }
}

export default async function initNetworkTransport(): Promise<NetworkTransport> {
  const connection = new ClientWebsocketTransport();

  return new Promise((resolve) => {
    (function checkConnection() {
      if (connection.readyState === WebSocket.OPEN) {
        resolve(connection);
      } else {
        setTimeout(checkConnection, 100);
      }
    })();
  });
}
