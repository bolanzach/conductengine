import { WsConnection } from '../conduct-ecs/systems/networkSystem';

const ws = new WebSocket('ws://localhost:4242');

ws.addEventListener('open', () => {
  console.log('Connected to the server');
});

ws.addEventListener('message', (event) => {
  console.log('Message from server', event.data);
});

ws.addEventListener('message', (event) => {
  console.log(event);
});

// // satisfies the WsConnection interface
// const websocketConnection = {
//   send(msg: string) {
//     if (ws.readyState !== ws.OPEN) {
//       setTimeout(() => {
//         websocketConnection.send(msg);
//       }, 100);
//     } else {
//       ws.send(msg);
//     }
//   },
// };

export default async function initWebsocket(): Promise<WsConnection> {
  return new Promise((resolve) => {
    (function checkConnection() {
      if (ws.readyState === ws.OPEN) {
        resolve(ws);
      } else {
        setTimeout(checkConnection, 100);
      }
    })();
  });
}
