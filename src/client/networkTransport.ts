import {
  NetworkTransport,
  TransportEvent,
} from '../conduct-core/networkTransport';

// const ws = new WebSocket('ws://localhost:4242');
//
//
//
// ws.addEventListener('message', (event) => {
//   console.log('Message from server', event.data);
// });

class ClientWebsocketTransport implements NetworkTransport {
  private ws: WebSocket;

  constructor() {
    this.ws = new WebSocket('ws://localhost:4242');

    this.ws.addEventListener('open', () => {
      console.log('Connected to the server');
    });
  }

  produceNetworkEvent(message: TransportEvent) {
    this.ws.send(message.toString());
  }

  registerNetworkHandler(cb: (message: TransportEvent) => void) {
    this.ws.addEventListener('message', (event) => {
      cb(event.data);
    });
  }

  get readyState() {
    return this.ws.readyState;
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
