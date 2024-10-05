import { GameServer } from './gameServer';

import main from '../game/src/main';

const gameServer = new GameServer();

gameServer.start();

main({ gameHost: "server" });

