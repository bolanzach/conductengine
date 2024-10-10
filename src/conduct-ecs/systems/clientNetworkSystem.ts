import {
  NetworkTransport,
  TransportEvent,
} from '../../conduct-core/networkTransport';
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
          console.log('Client got spawn message', evt);
          networkTransport.setNetworked(evt.data.networkId);
          world.spawnBundle(evt.data.bundle);
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
