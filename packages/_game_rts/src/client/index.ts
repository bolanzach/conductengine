// RTS client entrypoint (rendering, input, client-side prediction)
// This code only runs in the browser.

import { ConductStart } from "@conduct/ecs";
import { WebSocketClientTransport } from "@conduct/networking/transport";
import type { NetworkMessage } from "@conduct/networking/protocol";

const SERVER_URL = "ws://localhost:3001";

let playerId: number | null = null;

const transport = new WebSocketClientTransport(SERVER_URL);

transport.onConnect(() => {
  console.log("[client] connected to server");
});

transport.onMessage((message: NetworkMessage) => {
  switch (message.type) {
    case 'connected':
      playerId = message.payload.playerId;
      console.log(`[client] assigned player ID: ${playerId}`);
      break;
  }
});

transport.onDisconnect(() => {
  console.log("[client] disconnected from server");
});

ConductStart(60);