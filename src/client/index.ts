import "reflect-metadata";

import { World } from "@/conduct-ecs";
import { EventManager } from "@/conduct-ecs/event";
import ClientNetworkInitSystem from "@/conduct-ecs/systems/clientNetworkInitSystem";
import EventInitSystem, {
  createEventBufferState,
  PrivateEventBufferState,
} from "@/conduct-ecs/systems/eventInitSystem";
import { NetworkTransportState } from "@/conduct-ecs/systems/networkSystem";

// import ClientNetworkSystem from "../conduct-ecs/systems/clientNetworkSystem";
import EventSystem, { EventState } from "../conduct-ecs/systems/eventSystem";
// import NetworkSystem from "../conduct-ecs/systems/networkSystem";
import MainGameStartInitSystem from "../game/src/main";
import { startTestGpu } from "./gpu";
import initNetworkTransport from "./networkTransport";

// Start the game on the client
(async function initClient() {
  const networkTransport = await initNetworkTransport();
  const events = new EventManager();
  const world = new World({ gameHost: "client", events });

  startTestGpu();

  world
    .registerState(EventState, events)
    .registerState(PrivateEventBufferState, createEventBufferState())
    .registerState(NetworkTransportState, networkTransport)

    .registerSystemInit(EventInitSystem)
    .registerSystemInit(ClientNetworkInitSystem)

    .registerSystem(EventSystem)
    //.registerSystem(new NetworkSystem(networkTransport, false, events))
    //.registerSystemInit(new ClientNetworkSystem(networkTransport))
    .registerSystemInit(MainGameStartInitSystem, true);
})();
