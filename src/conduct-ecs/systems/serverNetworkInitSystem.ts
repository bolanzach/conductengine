import { TransportEvent } from "@/conduct-core/networkTransport";
import { World } from "@/conduct-ecs";
import { NetworkTransportState } from "@/conduct-ecs/systems/networkSystem";

export default function ServerNetworkInitSystem(world: World) {
  const networkTransport = world.getState(NetworkTransportState);

  networkTransport.registerNetworkHandler((message) => {
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
