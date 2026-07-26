// RTS client entrypoint (rendering, input, client-side prediction)
// This code only runs in the browser.

import {
  ConductSpawnEntity,
  ConductAddComponent,
  ConductRegisterSystem,
  ConductStart,
  FixedUpdate,
  Update,
  getBundleComponents,
  getBundleChildren,
} from "@conduct/ecs";
import { WebSocketClientTransport, setClientTransport } from "@conduct/networking/clientTransport";
import { setClientBundles, pushSnapshot, setLocalPlayerId } from "@conduct/networking/clientNetworkReceive";
import ClientNetworkReceiveSystem from "@conduct/networking/clientNetworkReceiveSystem";
import { getLocalId } from "@conduct/networking/clientEntityMap";
import InputSystem, { Transform3D, listenForInput } from "@conduct/simulation";
import { MeshRenderer } from "@conduct/renderer/components/meshRenderer";
import { Material } from "@conduct/renderer/components/material";
import { Camera } from "@conduct/renderer/components/camera";
import { MESH } from "@conduct/renderer/mesh";
import { initRenderer } from "@conduct/renderer/webGpu";
import CameraSystem from "@conduct/renderer/systems/cameraSystem";
import RendererSystem from "@conduct/renderer/systems/rendererSystem";
import type { ToClientMessage, GameCommand } from "@conduct/networking/protocol";
import { BUNDLE, BundleRegistry, startRTS } from "../game";
import { SpaceMarineBundle, SquadBundle, TileBundle } from "../game/bundles";
import { replicateComponents } from "../game/network";
import { pushGameCommand } from "../game/commandQueue";
import CommandSystem from "../game/systems/commandSystem";
import PathfindingSystem from "../game/systems/pathfindingSystem";
import TargetAcquisitionSystem from "../game/systems/targetAcquisitionSystem";
import MovementSystem from "../game/systems/movementSystem";
import ChildTransformSystem from "../game/systems/childTransformSystem";
import SquadCenterSystem from "../game/systems/squadCenterSystem";
import ColliderSystem from "../game/systems/colliderSystem";
import RtsInputSystem from "./rtsInputSystem";
import OwnedAutoSelectSystem from "./ownedAutoSelectSystem";
import { CameraPan } from "./cameraPan";
import CameraPanSystem from "./cameraPanSystem";
import FpsSystem from "./fpsSystem";

const SERVER_URL = "ws://localhost:3001";

const canvas = document.getElementById("conduct") as HTMLCanvasElement;
await initRenderer(canvas);

replicateComponents();

const bundles: BundleRegistry = {
  [BUNDLE.SPACE_MARINE]: [
    ...getBundleComponents(SpaceMarineBundle),
    [MeshRenderer, { meshId: MESH.CUBE }],
    [Material, { r: 0.2, g: 0.6, b: 1.0 }],
    [
      ...getBundleComponents(getBundleChildren(SpaceMarineBundle)[0]!),
      [MeshRenderer, { meshId: MESH.CUBE }],
      [Material, { r: 1.0, g: 0.0, b: 0.0 }],
    ],
  ],
  [BUNDLE.TILE]: [
    ...TileBundle,
    [MeshRenderer, { meshId: MESH.CUBE }],
    [Material, { r: 0.1, g: 0.5, b: 0.3 }],
  ],
  [BUNDLE.STRUCTURE_TILE]: [
    ...TileBundle,
    [MeshRenderer, { meshId: MESH.CUBE }],
    [Material, { r: 0.4, g: 0.2, b: 0.1 }],
  ],
  [BUNDLE.SQUAD]: SquadBundle,
};

setClientBundles(bundles);

const transport = new WebSocketClientTransport(SERVER_URL);
setClientTransport(transport);

/**
 * Translates server entity IDs in a command to local client entity IDs.
 * Commands from the server reference server IDs, but the local simulation
 * uses local IDs (mapped via clientEntityMap).
 */
function translateCommandToLocal(command: GameCommand): GameCommand | null {
  if (command.type === 'move') {
    const data = command.data as { entities: number[]; x: number; z: number };
    const localEntities: number[] = [];
    for (let i = 0; i < data.entities.length; i++) {
      const localId = getLocalId(data.entities[i]!);
      if (localId === undefined) return null;
      localEntities.push(localId);
    }
    return { ...command, data: { entities: localEntities, x: data.x, z: data.z } };
  }
  return command;
}

transport.onConnect(() => {
  console.log("[client] connected to server");
});

transport.onMessage((message: ToClientMessage) => {
  switch (message.type) {
    case 'connected':
      setLocalPlayerId(message.payload.playerId);
      console.log(`[client] assigned player ID: ${message.payload.playerId}`);
      startRTS(bundles);
      break;
    case 'snapshot':
      pushSnapshot(message.payload);
      break;
    case 'commands':
      for (let i = 0; i < message.payload.commands.length; i++) {
        const local = translateCommandToLocal(message.payload.commands[i]!);
        if (local) pushGameCommand(local);
      }
      break;
  }
});

transport.onDisconnect(() => {
  console.log("[client] disconnected from server");
});

listenForInput();

// Camera
const camera = ConductSpawnEntity();
ConductAddComponent(camera, Transform3D, { y: 10, z: 15, rx: -1.0 });
ConductAddComponent(camera, Camera, { aspect: canvas.width / canvas.height, far: 200 });
ConductAddComponent(camera, CameraPan);

// FixedUpdate: simulation systems (same order as server)
ConductRegisterSystem(FixedUpdate, CommandSystem);
ConductRegisterSystem(FixedUpdate, PathfindingSystem);
ConductRegisterSystem(FixedUpdate, TargetAcquisitionSystem);
ConductRegisterSystem(FixedUpdate, MovementSystem);
ConductRegisterSystem(FixedUpdate, ChildTransformSystem);
ConductRegisterSystem(FixedUpdate, SquadCenterSystem);
ConductRegisterSystem(FixedUpdate, ColliderSystem);
ConductRegisterSystem(FixedUpdate, ClientNetworkReceiveSystem);
ConductRegisterSystem(FixedUpdate, OwnedAutoSelectSystem);

// Update: input, interpolation, camera, rendering
ConductRegisterSystem(Update, InputSystem);
ConductRegisterSystem(Update, RtsInputSystem);
ConductRegisterSystem(Update, CameraSystem);
ConductRegisterSystem(Update, CameraPanSystem);
ConductRegisterSystem(Update, RendererSystem);
ConductRegisterSystem(Update, FpsSystem);

ConductStart(60);