import main from '../game/src/main';
import { startTestGpu } from './gpu';
import initWebsocket from './websocket';

function clientSetup() {
  startTestGpu();
}

// Start the game on the client
(async function initClient() {
  const wsConnection = await initWebsocket();
  main({ gameHost: 'client', setup: clientSetup, wsConnection });
})();

// main({ gameHost: 'client', setup: clientSetup, wsConnection: ws });
