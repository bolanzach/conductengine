import "reflect-metadata";

import { World } from "../conduct-ecs";
import { EventManager } from "../conduct-ecs/event";
import EventSystem from "../conduct-ecs/systems/eventSystem";
import NetworkSystem from "../conduct-ecs/systems/networkSystem";
import ServerInputSystem from "../conduct-ecs/systems/serverInputSystem";
import { ServerNetworkSystem } from "../conduct-ecs/systems/serverNetworkSystem";
import MainGameStartSystem from "../game/src/main";
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
    .setGlobal(events)
    .registerSystem(EventSystem)
    //.registerSystem(new NetworkSystem(gameServer, true, events))
    //.registerSystem(new ServerInputSystem(gameServer))
    //.registerSystemInit(new ServerNetworkSystem(gameServer))
    .registerSystemInit(MainGameStartSystem, true);
})();
