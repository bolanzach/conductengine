// RTS client entrypoint (rendering, input, client-side prediction)
// This code only runs in the browser.

import { ConductSpawnEntity, ConductAddComponent, ConductRegisterSystem, ConductStart, FixedUpdate, Update } from "@conduct/ecs";
import { WebSocketClientTransport } from "@conduct/networking/transport";
import { ConductNetworkReplicateComponent, Networked } from "@conduct/networking/replication";
import { setClientBundles, pushSnapshot } from "@conduct/networking/clientNetworkReceive";
import ClientNetworkReceiveSystem from "@conduct/networking/clientNetworkReceiveSystem";
import { Transform3D } from "@conduct/simulation";
import { MeshRenderer } from "@conduct/renderer/components/meshRenderer";
import { Material } from "@conduct/renderer/components/material";
import { Camera } from "@conduct/renderer/components/camera";
import { MESH } from "@conduct/renderer/mesh";
import { initRenderer } from "@conduct/renderer/webGpu";
import CameraSystem from "@conduct/renderer/systems/cameraSystem";
import RendererSystem from "@conduct/renderer/systems/rendererSystem";
import type { NetworkMessage } from "@conduct/networking/protocol";
import type { Bundle } from "@conduct/networking/replication";
import { BUNDLE } from "../shared";

const SERVER_URL = "ws://localhost:3001";

const canvas = document.getElementById("conduct") as HTMLCanvasElement;
await initRenderer(canvas);

ConductNetworkReplicateComponent(Transform3D);

const bundles: Record<number, Bundle> = {
  [BUNDLE.PLAYER]: () => {
    const entity = ConductSpawnEntity();
    ConductAddComponent(entity, Transform3D);
    ConductAddComponent(entity, Networked, { bundle: BUNDLE.PLAYER });
    ConductAddComponent(entity, MeshRenderer, { meshId: MESH.CUBE });
    ConductAddComponent(entity, Material, { r: 0.2, g: 0.6, b: 1.0 });
    return entity;
  },
};

setClientBundles(bundles);

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
    case 'snapshot':
      pushSnapshot(message.payload);
      break;
  }
});

transport.onDisconnect(() => {
  console.log("[client] disconnected from server");
});

// Camera
const camera = ConductSpawnEntity();
ConductAddComponent(camera, Transform3D, { y: 20, z: 15, rx: -1.0 });
ConductAddComponent(camera, Camera, { aspect: canvas.width / canvas.height, far: 200 });

ConductRegisterSystem(FixedUpdate, ClientNetworkReceiveSystem);
ConductRegisterSystem(Update, CameraSystem);
ConductRegisterSystem(Update, RendererSystem);

ConductStart(60);