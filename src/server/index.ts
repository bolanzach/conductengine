import 'reflect-metadata';

import { World } from '../conduct-ecs';
import NetworkSystem from '../conduct-ecs/systems/networkSystem';
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
    .registerSystem(new NetworkSystem(world, gameServer))
    .registerSystemInit(new MainGameStartSystem(), true);
})();
