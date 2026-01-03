import "reflect-metadata";

import * as SYSTEM_DEFINITIONS from "@/conduct-core-server/systemDefinitions";
import { World } from "@/conduct-ecs";
import { EventManager } from "@/conduct-ecs/event";
import { registerSystemDefinitions } from "@/conduct-ecs/system";
import CameraSystem from "@/conduct-ecs/systems/cameraSystem";

import EventSystem, {
  EventState,
  EventStateImpl,
} from "../conduct-ecs/systems/eventSystem";
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
    .registerState(EventState, new EventStateImpl(events))
    .registerState(NetworkTransportState, gameServer)

    .registerSystem(EventSystem)
    .registerSystem(CameraSystem)

    .registerSystemInit(MainGameStartInitSystem, true);

  //.registerSystem(new NetworkSystem(gameServer, true, events))
  //.registerSystem(new ServerInputSystem(gameServer))
  //.registerSystemInit(new ServerNetworkInitSystem(gameServer))
})();
