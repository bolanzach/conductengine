import "reflect-metadata";

import { World } from "@/conduct-ecs";
import { EventManager } from "@/conduct-ecs/event";
import { registerSystemDefinitions } from "@/conduct-ecs/system";
import EventInitSystem, {
  createEventBufferState,
  PrivateEventBufferState,
} from "@/conduct-ecs/systems/eventInitSystem";
import ServerNetworkInitSystem from "@/conduct-ecs/systems/serverNetworkInitSystem";
import * as SYSTEM_DEFINITIONS from "@/server/systemDefinitions";

import EventSystem, { EventState } from "../conduct-ecs/systems/eventSystem";
import { NetworkTransportState } from "../conduct-ecs/systems/networkSystem";
// import ServerInputSystem from "../conduct-ecs/systems/serverInputSystem";
// import { ServerNetworkInitSystem } from "../conduct-ecs/systems/serverNetworkSystem";
import MainGameStartInitSystem from "../game/src/main";
import { GameServer } from "./gameServer";

// @ts-expect-error this is fine
registerSystemDefinitions(SYSTEM_DEFINITIONS);

(function () {
  const gameServer = new GameServer();
  gameServer.start();

  const events = new EventManager();
  const world = new World({
    gameHost: "server",
    events,
  });

  world
    .registerState(EventState, events)
    .registerState(PrivateEventBufferState, createEventBufferState())
    .registerState(NetworkTransportState, gameServer)

    .registerSystemInit(EventInitSystem)
    .registerSystemInit(ServerNetworkInitSystem)

    .registerSystem(EventSystem)
    //.registerSystem(new NetworkSystem(gameServer, true, events))
    //.registerSystem(new ServerInputSystem(gameServer))
    //.registerSystemInit(new ServerNetworkInitSystem(gameServer))
    .registerSystemInit(MainGameStartInitSystem, true);
})();
