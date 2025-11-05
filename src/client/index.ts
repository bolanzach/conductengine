import "reflect-metadata";

import * as SYSTEM_DEFINITIONS from "@/client/systemDefinitions";
import { World } from "@/conduct-ecs";
import { EventManager } from "@/conduct-ecs/event";
import { Canvas, CanvasState } from "@/conduct-ecs/state/client/canvasState";
import { Input, InputState } from "@/conduct-ecs/state/client/inputState";
import { registerSystemDefinitions } from "@/conduct-ecs/system";
import CameraSystem from "@/conduct-ecs/systems/cameraSystem";
import ClientNetworkInitSystem from "@/conduct-ecs/systems/client/clientNetworkInitSystem";
import InputSystem from "@/conduct-ecs/systems/client/inputSystem";
import WebGpuRendererInitSystem from "@/conduct-ecs/systems/client/render/webGpuRendererInitSystem.client";
import WebGpuRendererSystem from "@/conduct-ecs/systems/client/render/webGpuRendererSystem.client";
import EventInitSystem, {
  createEventBufferState,
  PrivateEventBufferState,
} from "@/conduct-ecs/systems/eventInitSystem";
import { NetworkTransportState } from "@/conduct-ecs/systems/networkSystem";

// import ClientNetworkSystem from "../conduct-ecs/systems/clientNetworkSystem";
import EventSystem, { EventState } from "../conduct-ecs/systems/eventSystem";
// import NetworkSystem from "../conduct-ecs/systems/networkSystem";
import MainGameStartInitSystem from "../game/src/main";
// import { startTestGpu } from "./gpu";
import initNetworkTransport from "./networkTransport";

// @ts-expect-error this is fine
registerSystemDefinitions(SYSTEM_DEFINITIONS);

// Start the game on the client
(async function initClient() {
  const networkTransport = await initNetworkTransport();
  const events = new EventManager();
  const canvas = new Canvas();
  const world = new World({ gameHost: "client", events });

  //startTestGpu();

  await world
    .registerState(EventState, events)
    .registerState(PrivateEventBufferState, createEventBufferState())
    .registerState(NetworkTransportState, networkTransport)
    .registerState(CanvasState, canvas)
    .registerState(InputState, new Input(canvas))

    .registerSystem(InputSystem)
    .registerSystem(EventSystem)
    .registerSystem(CameraSystem)
    .registerSystem(WebGpuRendererSystem)

    .registerSystemInit(EventInitSystem)
    .then((w) => w.registerSystemInit(ClientNetworkInitSystem))
    .then((w) => w.registerSystemInit(WebGpuRendererInitSystem, true))
    .then((w) => w.registerSystemInit(MainGameStartInitSystem, true));

  //.registerSystem(new NetworkSystem(networkTransport, false, events))
  //.registerSystemInit(new ClientNetworkSystem(networkTransport))
})();
