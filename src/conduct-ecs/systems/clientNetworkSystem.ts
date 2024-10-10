import {
  NetworkTransport,
  TransportEvent,
} from '../../conduct-core/networkTransport';
import { isNetworkComponent, NETWORK_ID } from '../components/network';
import { SystemInit } from '../system';
import { World } from '../world';

export default class ClientNetworkSystem implements SystemInit {
  constructor(private networkTransport: NetworkTransport) {}

  init(world: World) {
    const networkTransport = this.networkTransport;
    networkTransport.registerNetworkHandler((message) => {
      const matchEventType: Record<
        TransportEvent['eventType'],
        (evt: TransportEvent) => void
      > = {
        spawn(evt: TransportEvent): void {
          //networkTransport.setNetworked(evt.data.networkId);

          const entity = world.spawnBundle(evt.data.bundle);
          const components = world.getAllComponentsForEntity(entity);

          components.forEach((component) => {
            if (isNetworkComponent(component)) {
              // @ts-expect-error we have to update the network_id here
              component[NETWORK_ID] = evt.data.networkId;
            }
          });
        },
        update(evt: TransportEvent): void {
          // client should get update messages
        },
        spawn_request(_: TransportEvent): void {
          // client should not get spawn requests
        },
      };

      matchEventType[message.eventType](message);
    });
  }
}
