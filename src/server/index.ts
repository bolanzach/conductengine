import { World } from '../conduct-ecs';
import main from '../game/src/main';
import { GameServer } from './gameServer';

const gameServer = new GameServer();

gameServer.start();

function setup(w: World) {
  // Server specific setup

  gameServer.wsOnMessage((message) => {
    if (message.data.type === 'spawn') {
      const networkComponent = message.data.components[0];
      const bundle = networkComponent.bundle;
      const idk = w.buildBundle(bundle, networkComponent);
      console.log(idk);
    }
  });
}

// Start the game on the server
main({ gameHost: 'server', setup, wsConnection: gameServer });
