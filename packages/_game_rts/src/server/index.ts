// RTS server entrypoint (authoritative simulation, networking)
// This code only runs on the server. No DOM/rendering imports allowed.

import { ConductSpawnEntity, ConductAddComponent, ConductRegisterSystem, ConductStart, FixedUpdate, tick } from "@conduct/ecs";
import { WebSocketServerTransport, setServerTransport } from "@conduct/networking/serverTransport";
import { pushCommand } from "@conduct/networking/serverCommandReceive";
import ServerNetworkSnapshotSystem from "@conduct/networking/serverNetworkSnapshotSystem";
import ServerNetworkSendSystem from "@conduct/networking/serverNetworkSend";
import { Networked } from "@conduct/networking/networked";
import { Transform3D } from "@conduct/simulation";
import { BUNDLE, BundleRegistry, startRTS } from "../shared";
import { replicateComponents } from "../shared/network.js";
import CommandSystem from "./commandSystem.js";
import MovementSystem from "./movementSystem.js";

const PORT = 3001;

replicateComponents()

const bundles: BundleRegistry = {
  [BUNDLE.PLAYER]: () => {
    const entity = ConductSpawnEntity();
    ConductAddComponent(entity, Transform3D);
    ConductAddComponent(entity, Networked, { bundle: BUNDLE.PLAYER });
    return entity;
  },
  [BUNDLE.GROUND]: () => {
    const entity = ConductSpawnEntity();
    ConductAddComponent(entity, Transform3D, { sx: 30, sy: 0.2, sz: 30 });
    return entity;
  },
};

const transport = new WebSocketServerTransport(PORT);
setServerTransport(transport);

transport.onConnection((playerId) => {
  console.log(`[server] player ${playerId} connected`);

  const entity = bundles[BUNDLE.PLAYER]!();
  ConductAddComponent(entity, Networked, { owner: playerId });

  transport.sendTo(playerId, {
    type: 'connected',
    payload: { playerId, tick },
  });
});

transport.onDisconnect((playerId) => {
  console.log(`[server] player ${playerId} disconnected`);
});

transport.onMessage((playerId, message) => {
  if (message.type === 'command') {
    pushCommand({ ...message.payload, playerId });
  }
});

startRTS(bundles);

ConductRegisterSystem(FixedUpdate, CommandSystem);
ConductRegisterSystem(FixedUpdate, MovementSystem);
ConductRegisterSystem(FixedUpdate, ServerNetworkSnapshotSystem);
ConductRegisterSystem(FixedUpdate, ServerNetworkSendSystem);

console.log(`[server] listening on ws://localhost:${PORT}`);
ConductStart(60);