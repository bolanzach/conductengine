// RTS client entrypoint (rendering, input, client-side prediction)
// This code only runs in the browser.

import { ConductSpawnEntity, ConductAddComponent, ConductRegisterSystem, ConductStart, FixedUpdate, Update } from "@conduct/ecs";
import { WebSocketClientTransport, setClientTransport } from "@conduct/networking/transport";
import { Networked } from "@conduct/networking/replication";
import { setClientBundles, pushSnapshot, setLocalPlayerId } from "@conduct/networking/clientNetworkReceive";
import ClientNetworkReceiveSystem from "@conduct/networking/clientNetworkReceiveSystem";
import InputSystem, { Transform3D, listenForInput } from "@conduct/simulation";
import { MeshRenderer } from "@conduct/renderer/components/meshRenderer";
import { Material } from "@conduct/renderer/components/material";
import { Camera } from "@conduct/renderer/components/camera";
import { MESH } from "@conduct/renderer/mesh";
import { initRenderer } from "@conduct/renderer/webGpu";
import CameraSystem from "@conduct/renderer/systems/cameraSystem";
import RendererSystem from "@conduct/renderer/systems/rendererSystem";
import type { NetworkMessage } from "@conduct/networking/protocol";
import { BUNDLE, BundleRegistry, startRTS } from "../shared";
import { replicateComponents } from "../shared/network";
import RtsInputSystem from "./inputSystem";
import OwnedAutoSelectSystem from "./ownedAutoSelectSystem";

const SERVER_URL = "ws://localhost:3001";

const canvas = document.getElementById("conduct") as HTMLCanvasElement;
await initRenderer(canvas);

replicateComponents();

const bundles: BundleRegistry = {
  [BUNDLE.PLAYER]: () => {
    const entity = ConductSpawnEntity();
    ConductAddComponent(entity, Transform3D);
    ConductAddComponent(entity, Networked, { bundle: BUNDLE.PLAYER });
    ConductAddComponent(entity, MeshRenderer, { meshId: MESH.CUBE });
    ConductAddComponent(entity, Material, { r: 0.2, g: 0.6, b: 1.0 });
    return entity;
  },
  [BUNDLE.GROUND]: () => {
    const entity = ConductSpawnEntity();
    ConductAddComponent(entity, Transform3D, { sx: 30, sy: 0.2, sz: 30 });
    ConductAddComponent(entity, MeshRenderer, { meshId: MESH.CUBE });
    ConductAddComponent(entity, Material, { r: 0.1, g: 0.5, b: 0.3 });
    return entity;
  },
};

setClientBundles(bundles);

const transport = new WebSocketClientTransport(SERVER_URL);
setClientTransport(transport);

transport.onConnect(() => {
  console.log("[client] connected to server");
});

transport.onMessage((message: NetworkMessage) => {
  switch (message.type) {
    case 'connected':
      setLocalPlayerId(message.payload.playerId);
      console.log(`[client] assigned player ID: ${message.payload.playerId}`);
      startRTS(bundles);
      break;
    case 'snapshot':
      pushSnapshot(message.payload);
      break;
  }
});

transport.onDisconnect(() => {
  console.log("[client] disconnected from server");
});

listenForInput();

// Camera
const camera = ConductSpawnEntity();
ConductAddComponent(camera, Transform3D, { y: 20, z: 15, rx: -1.0 });
ConductAddComponent(camera, Camera, { aspect: canvas.width / canvas.height, far: 200 });

ConductRegisterSystem(Update, InputSystem);
ConductRegisterSystem(Update, RtsInputSystem);
ConductRegisterSystem(FixedUpdate, ClientNetworkReceiveSystem);
ConductRegisterSystem(FixedUpdate, OwnedAutoSelectSystem);
ConductRegisterSystem(Update, CameraSystem);
ConductRegisterSystem(Update, RendererSystem);

ConductStart(60);