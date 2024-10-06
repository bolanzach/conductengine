import { NetworkAuthority, NetworkComponent } from '../components/network';
import { isNetworkedComponent } from '../network';
import { Query, System, SystemParams } from '../system';

const getAuthority = (): NetworkAuthority => {
  try {
    return process && process.env ? 'server' : 'client';
  } catch (_) {
    return 'client';
  }
};

export interface WsConnection {
  send: (data: string) => void;
}

export default class NetworkSystem implements System {
  constructor(private wsConnection: WsConnection) {}

  @Query()
  update({ entity, world }: SystemParams, networkComponent: NetworkComponent) {
    const components = world.getAllComponentsForEntity(entity);
    const networkedComponents = components.filter(isNetworkedComponent);

    if (!networkComponent.isSpawned) {
      if (networkComponent.authority === getAuthority()) {
        // Send spawn message
        this.wsConnection.send(
          JSON.stringify({
            type: 'spawn',
            components: [networkComponent, ...networkedComponents],
          })
        );
        networkComponent.isSpawned = true;
      }
    } else {
      // Send update message
      this.wsConnection.send(
        JSON.stringify({
          type: 'update',
          components: [networkComponent, ...networkedComponents],
        })
      );
    }
  }
}
