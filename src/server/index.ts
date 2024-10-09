import 'reflect-metadata';

import { World } from '../conduct-ecs';
import NetworkSystem from '../conduct-ecs/systems/networkSystem';
import MainGameStartSystem from '../game/src/main';
import { GameServer } from './gameServer';

(function () {
  const gameServer = new GameServer();
  gameServer.start();
  const world = new World({ gameHost: 'server' });

  world
    .registerSystem(new NetworkSystem(gameServer, true))
    .registerSystemInit(new MainGameStartSystem('server'));
})();
