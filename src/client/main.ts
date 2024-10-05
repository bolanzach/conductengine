import main from '../game/src/main';
import { startTestGpu } from './gpu';

function clientSetup() {
  startTestGpu();
}

// Start the game on the client
main({ gameHost: 'client', setup: clientSetup });
