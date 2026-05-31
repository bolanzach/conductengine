// RTS server entrypoint (authoritative simulation, networking)
// This code only runs on the server. No DOM/rendering imports allowed.

import { ConductSpawnBundle, ConductRegisterSystem, ConductStart, FixedUpdate, tick } from "@conduct/ecs";
import { WebSocketServerTransport, setServerTransport } from "@conduct/networking/serverTransport";
import { pushCommand } from "@conduct/networking/serverCommandReceive";
import ServerNetworkSnapshotSystem from "@conduct/networking/serverNetworkSnapshotSystem";
import ServerNetworkSendSystem from "@conduct/networking/serverNetworkSend";
import { Networked } from "@conduct/networking/networked";
import { Transform3D } from "@conduct/simulation";
import { BUNDLE, BundleRegistry, startRTS } from "../shared/index.js";
import { SpaceMarineBundle, TileBundle } from "../shared/bundles.js";
import { replicateComponents } from "../shared/network.js";
import { SquadMember } from "../shared/squadMember.js";
import CommandSystem from "./commandSystem.js";
import MovementSystem from "./movementSystem.js";
import { FormationOffset } from "./formationOffset.js";

const PORT = 3001;

replicateComponents()

const bundles: BundleRegistry = {
  [BUNDLE.SPACE_MARINE]: SpaceMarineBundle,
  [BUNDLE.TILE]: TileBundle,
};

const transport = new WebSocketServerTransport(PORT);
setServerTransport(transport);

const SQUAD_SIZE = 5;
const FORMATION_SPREAD = 0.8;
let nextSquadId = 1;

function spawnSquad(x: number, z: number, owner: number) {
  const squadId = nextSquadId++;
  for (let i = 0; i < SQUAD_SIZE; i++) {
    const angle = (i / SQUAD_SIZE) * Math.PI * 2;
    const ox = Math.cos(angle) * FORMATION_SPREAD;
    const oz = Math.sin(angle) * FORMATION_SPREAD;
    ConductSpawnBundle([
      ...SpaceMarineBundle,
      [Transform3D, { x: x + ox, z: z + oz }],
      [Networked, { owner }],
      [SquadMember, { squadId, slotIndex: i }],
      [FormationOffset, { x: ox, z: oz }],
    ]);
  }
}

transport.onConnection((playerId) => {
  console.log(`[server] player ${playerId} connected`);

  spawnSquad(-2, 0, playerId);
  spawnSquad(1, 0, playerId);

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