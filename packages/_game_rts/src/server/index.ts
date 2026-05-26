// RTS server entrypoint (authoritative simulation, networking)
// This code only runs on the server. No DOM/rendering imports allowed.

import { ConductSpawnEntity, ConductAddComponent, ConductRegisterSystem, ConductStart, FixedUpdate, tick } from "@conduct/ecs";
import { WebSocketServerTransport, setServerTransport } from "@conduct/networking/serverTransport";
import NetworkSnapshotSystem from "@conduct/networking/networkSnapshotSystem";
import ServerNetworkSendSystem from "@conduct/networking/serverNetworkSend";
import { ConductNetworkReplicateComponent, Networked } from "@conduct/networking/replication";
import { Transform3D } from "@conduct/simulation";
import type { Bundle } from "@conduct/networking/replication";
import { BUNDLE } from "../shared/index.js";

const PORT = 3001;

ConductNetworkReplicateComponent(Transform3D);

const bundles: Record<number, Bundle> = {
  [BUNDLE.PLAYER]: () => {
    const entity = ConductSpawnEntity();
    ConductAddComponent(entity, Transform3D);
    ConductAddComponent(entity, Networked, { bundle: BUNDLE.PLAYER });
    return entity;
  },
};

const transport = new WebSocketServerTransport(PORT);

transport.onConnection((playerId) => {
  console.log(`[server] player ${playerId} connected`);

  const entity = bundles[BUNDLE.PLAYER]!();
  console.log(`[server] spawned player entity ${entity}`);

  transport.sendTo(playerId, {
    type: 'connected',
    payload: { playerId, tick },
  });
});

transport.onDisconnect((playerId) => {
  console.log(`[server] player ${playerId} disconnected`);
});

transport.onMessage((playerId, message) => {
  console.log(`[server] player ${playerId}:`, message.type);
});

setServerTransport(transport);
ConductRegisterSystem(FixedUpdate, NetworkSnapshotSystem);
ConductRegisterSystem(FixedUpdate, ServerNetworkSendSystem);

console.log(`[server] listening on ws://localhost:${PORT}`);
ConductStart(60);