import "reflect-metadata";

import { World } from "../conduct-ecs";
import NetworkSystem from "../conduct-ecs/systems/networkSystem";
import ServerInputSystem from "../conduct-ecs/systems/serverInputSystem";
import { ServerNetworkSystem } from "../conduct-ecs/systems/serverNetworkSystem";
import MainGameStartSystem from "../game/src/main";
import { GameServer } from "./gameServer";

(function () {
  const gameServer = new GameServer();
  gameServer.start();
  const world = new World({
    gameHost: "server",
  });

  world
    .registerSystem(new NetworkSystem(gameServer))
    .registerSystem(new ServerInputSystem(gameServer))
    .registerSystemInit(new ServerNetworkSystem(gameServer))
    .registerSystemInit(new MainGameStartSystem(), true);
})();
