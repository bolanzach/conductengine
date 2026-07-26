// RTS server entrypoint (authoritative simulation, networking)
// This code only runs on the server. No DOM/rendering imports allowed.

import { ConductSpawnBundle, ConductGetComponent, ConductRegisterSystem, ConductRunSystem, ConductStart, FixedUpdate, tick } from "@conduct/ecs";
import { WebSocketServerTransport, setServerTransport } from "@conduct/networking/serverTransport";
import ServerNetworkSnapshotSystem, { queueBootstrapSnapshot } from "@conduct/networking/serverNetworkSnapshotSystem";
import { Networked } from "@conduct/networking/networked";
import { Transform3D } from "@conduct/simulation";
import { BUNDLE, BundleRegistry, startRTS } from "../game/index.js";
import { SpaceMarineBundle, SquadBundle, TileBundle } from "../game/bundles.js";
import { replicateComponents } from "../game/network.js";
import { SquadMember } from "../game/squadMember.js";
import { FormationOffset } from "../game/formationOffset.js";
import { pushGameCommand } from "../game/commandQueue.js";
import CommandSystem from "../game/systems/commandSystem.js";
import PathfindingSystem from "../game/systems/pathfindingSystem.js";
import ColliderSystem from "../game/systems/colliderSystem.js";
import TargetAcquisitionSystem from "../game/systems/targetAcquisitionSystem.js";
import MovementSystem from "../game/systems/movementSystem.js";
import SquadCenterSystem from "../game/systems/squadCenterSystem.js";
import ChildTransformSystem from "../game/systems/childTransformSystem.js";
import type { GameCommand } from "@conduct/networking/protocol";

const PORT = 3001;

replicateComponents()

const bundles: BundleRegistry = {
  [BUNDLE.SPACE_MARINE]: SpaceMarineBundle,
  [BUNDLE.TILE]: TileBundle,
  [BUNDLE.STRUCTURE_TILE]: TileBundle,
  [BUNDLE.SQUAD]: SquadBundle,
};

const transport = new WebSocketServerTransport(PORT);
setServerTransport(transport);

const SQUAD_SIZE = 6;
const FORMATION_SPREAD = 0.3;

function spawnSquad(x: number, z: number, owner: number) {
  const squadId = ConductSpawnBundle([
    ...SquadBundle,
    [Transform3D, { x, z }],
    [Networked, { owner }],
  ]);

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

/**
 * Validates a command by checking entity ownership.
 * Returns true if at least one entity in the command is owned by the player.
 */
function validateCommand(command: GameCommand): boolean {
  if (command.type === 'move') {
    const data = command.data as { entities: number[] };
    for (let i = 0; i < data.entities.length; i++) {
      const networked = ConductGetComponent(data.entities[i]!, Networked);
      if (networked && networked.owner === command.playerId) return true;
    }
    return false;
  }
  return false;
}

transport.onConnection((playerId) => {
  console.log(`[server] player ${playerId} connected`);

  // spawnSquad(-2, 0, playerId);
  spawnSquad(0, 0, playerId);

  transport.sendTo(playerId, {
    type: 'connected',
    payload: { playerId, tick },
  });

  queueBootstrapSnapshot(playerId);
  ConductRunSystem(ServerNetworkSnapshotSystem);
});

transport.onDisconnect((playerId) => {
  console.log(`[server] player ${playerId} disconnected`);
});

transport.onMessage((playerId, message) => {
  if (message.type === 'command') {
    const command = { ...message.payload, playerId };

    if (!validateCommand(command)) return;

    // Broadcast to all other clients
    transport.broadcastExcept(playerId, {
      type: 'commands',
      payload: { tick, commands: [command] },
    });

    // Apply to local simulation
    pushGameCommand(command);
  }
});

startRTS(bundles);

// Spawn enemy squads for testing target acquisition
// spawnSquad(8, 0, 0);
// spawnSquad(8, 3, 0);

ConductRegisterSystem(FixedUpdate, CommandSystem);
ConductRegisterSystem(FixedUpdate, PathfindingSystem);
ConductRegisterSystem(FixedUpdate, TargetAcquisitionSystem);
ConductRegisterSystem(FixedUpdate, MovementSystem);
ConductRegisterSystem(FixedUpdate, ChildTransformSystem);
ConductRegisterSystem(FixedUpdate, SquadCenterSystem);
ConductRegisterSystem(FixedUpdate, ColliderSystem);

console.log(`[server] listening on ws://localhost:${PORT}`);
ConductStart(60);