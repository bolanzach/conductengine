import { GameServer } from './gameServer';

import main from '../game/src/main';
import { World } from '../conduct-ecs';

const gameServer = new GameServer();

gameServer.start();

function setup(w: World) {
  // Server specific setup
}

// Start the game on the server
main({ gameHost: "server", setup });

