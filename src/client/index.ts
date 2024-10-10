import 'reflect-metadata';

import { World } from '../conduct-ecs';
import ClientNetworkSystem from '../conduct-ecs/systems/clientNetworkSystem';
import NetworkSystem from '../conduct-ecs/systems/networkSystem';
import MainGameStartSystem from '../game/src/main';
import { startTestGpu } from './gpu';
import initNetworkTransport from './networkTransport';

// Start the game on the client
(async function initClient() {
  const networkTransport = await initNetworkTransport();
  const world = new World({ gameHost: 'client' });

  startTestGpu();

  world
    .registerSystem(new NetworkSystem(networkTransport))
    .registerSystemInit(new ClientNetworkSystem(networkTransport))
    .registerSystemInit(new MainGameStartSystem(), true);
})();
