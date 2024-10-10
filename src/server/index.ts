import 'reflect-metadata';

import { World } from '../conduct-ecs';
import NetworkSystem from '../conduct-ecs/systems/networkSystem';
import { ServerNetworkSystem } from '../conduct-ecs/systems/serverNetworkSystem';
import MainGameStartSystem from '../game/src/main';
import { GameServer } from './gameServer';

(function () {
  const gameServer = new GameServer();
  gameServer.start();
  const world = new World({
    gameHost: 'server',
    networkTransport: gameServer,
  });

  world
    .registerSystem(new NetworkSystem(gameServer))
    .registerSystemInit(new ServerNetworkSystem(gameServer))
    .registerSystemInit(new MainGameStartSystem(), true);
})();
