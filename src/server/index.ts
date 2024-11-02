import "reflect-metadata";

import { World } from "@/conduct-ecs";
import { EventManager } from "@/conduct-ecs/event";
import EventInitSystem, {
  createEventBufferState,
  PrivateEventBufferState,
} from "@/conduct-ecs/systems/eventInitSystem";
import ServerNetworkInitSystem from "@/conduct-ecs/systems/serverNetworkInitSystem";

import EventSystem, { EventState } from "../conduct-ecs/systems/eventSystem";
import { NetworkTransportState } from "../conduct-ecs/systems/networkSystem";
// import ServerInputSystem from "../conduct-ecs/systems/serverInputSystem";
// import { ServerNetworkInitSystem } from "../conduct-ecs/systems/serverNetworkSystem";
import MainGameStartInitSystem from "../game/src/main";
import { GameServer } from "./gameServer";

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
