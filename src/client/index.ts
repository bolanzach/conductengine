import 'reflect-metadata';

import { World } from '../conduct-ecs';
import NetworkSystem from '../conduct-ecs/systems/networkSystem';
import MainGameStartSystem from '../game/src/main';
import { startTestGpu } from './gpu';
import initNetworkTransport from './networkTransport';

// Start the game on the client
(async function initClient() {
  const networkTransport = await initNetworkTransport();
  const world = new World({ gameHost: 'client', networkTransport });

  startTestGpu();

  world
    .registerSystem(new NetworkSystem(world, networkTransport))
    .registerSystemInit(new MainGameStartSystem(), true);
})();
