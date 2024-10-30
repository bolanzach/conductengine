import "reflect-metadata";

import { World } from "../conduct-ecs";
import { EventManager } from "../conduct-ecs/event";
import ClientNetworkSystem from "../conduct-ecs/systems/clientNetworkSystem";
import EventSystem from "../conduct-ecs/systems/eventSystem";
import NetworkSystem from "../conduct-ecs/systems/networkSystem";
import MainGameStartSystem from "../game/src/main";
import { startTestGpu } from "./gpu";
import initNetworkTransport from "./networkTransport";

// Start the game on the client
(async function initClient() {
  const networkTransport = await initNetworkTransport();
  const events = new EventManager();
  const world = new World({ gameHost: "client", events });

  startTestGpu();

  world
    // .setGlobal(events)
    // .setGlobal(networkTransport)
    .registerSystem(EventSystem)
    //.registerSystem(new NetworkSystem(networkTransport, false, events))
    //.registerSystemInit(new ClientNetworkSystem(networkTransport))
    .registerSystemInit(MainGameStartSystem, true);
})();
