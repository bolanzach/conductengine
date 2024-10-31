import "reflect-metadata";

import EventInitSystem, {
  createEventBufferState,
  PrivateEventBufferState,
} from "@/conduct-ecs/systems/eventInitSystem";

import { World } from "../conduct-ecs";
import { EventManager } from "../conduct-ecs/event";
import EventSystem, { EventState } from "../conduct-ecs/systems/eventSystem";
import NetworkSystem from "../conduct-ecs/systems/networkSystem";
import ServerInputSystem from "../conduct-ecs/systems/serverInputSystem";
import { ServerNetworkSystem } from "../conduct-ecs/systems/serverNetworkSystem";
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
    // .registerSystemInit(EventInitSystem)
    // .registerSystem(EventSystem)
    //.registerSystem(new NetworkSystem(gameServer, true, events))
    //.registerSystem(new ServerInputSystem(gameServer))
    //.registerSystemInit(new ServerNetworkSystem(gameServer))
    .registerSystemInit(MainGameStartInitSystem, true);
})();
