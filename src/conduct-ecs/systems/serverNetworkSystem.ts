import {
  NetworkTransport,
  TransportEvent,
} from "../../conduct-core/networkTransport";
import { SystemInit } from "../system";
import { World } from "../world";

export class ServerNetworkSystem implements SystemInit {
  constructor(private networkTransport: NetworkTransport) {}

  init(world: World) {
    this.networkTransport.registerNetworkHandler((message) => {
      const matchEventType: Record<
        TransportEvent["eventType"],
        (evt: TransportEvent) => void
      > = {
        spawn_request(evt: TransportEvent): void {
          const bundle = evt.data.bundle;
          world.spawnBundle(bundle);
        },
        input(_: TransportEvent): void {
          // handled in serverInputSystem
        },
        spawn(_: TransportEvent): void {
          // server should not get spawn messages
        },
        update(_: TransportEvent): void {
          // server gets update messages?
        },
      };

      matchEventType[message.eventType](message);
    });
  }
}
