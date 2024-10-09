import { World } from '../conduct-ecs';
import NetworkSystem from '../conduct-ecs/systems/networkSystem';
import MainGameStartSystem from '../game/src/main';
import { startTestGpu } from './gpu';
import initNetworkTransport from './websocket';

// Start the game on the client
(async function initClient() {
  const networkTransport = await initNetworkTransport();
  const world = new World({ gameHost: 'client' });

  startTestGpu();

  world
    .registerSystem(new NetworkSystem(networkTransport, false))
    .registerSystemInit(new MainGameStartSystem('client'));
})();
