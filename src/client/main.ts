import main from '../game/src/main';
import { init } from './gpu';
import { renderSystem } from './renderSystem';

main({ gameHost: 'client', setup: renderSystem });

// Start the game on the client
init();
