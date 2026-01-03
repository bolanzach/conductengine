import { TransportEvent } from "@/conduct-core/networkTransport";
import { World } from "@/conduct-ecs";
import { NetworkTransportState } from "@/conduct-ecs/systems/networkSystem";

export default function ClientNetworkInitSystem(world: World) {
  const networkTransport = world.getState(NetworkTransportState);

  // networkTransport.registerNetworkHandler((message) => {
  //   const matchEventType: Record<
  //     TransportEvent["eventType"],
  //     (evt: TransportEvent) => void
  //   > = {
  //     /**
  //      * Handle when the server sends a spawn request
  //      */
  //     spawn(evt: TransportEvent): void {
  //       const entity = world.spawnBundle(evt.data.bundle);
  //       const components = world.getAllComponentsForEntity(entity);
  //
  //       components.forEach((component) => {
  //         if (isNetworkComponent(component)) {
  //           const networkId = evt.data.networkId;
  //           // @ts-expect-error we have to update the network_id here
  //           component[NETWORK_ID] = networkId;
  //           networkEntityMapping.push([networkId, entity]);
  //         }
  //       });
  //     },
  //
  //     /**
  //      * Handle generic updates from the server
  //      */
  //     update(evt: TransportEvent): void {
  //       Object.keys(evt.data).forEach((networkId) => {
  //         const mapping = networkEntityMapping.find(
  //           ([id]) => id === parseInt(networkId, 10)
  //         );
  //         if (!mapping) {
  //           return;
  //         }
  //
  //         const [_, entity] = mapping;
  //         const components = world.getAllComponentsForEntity(entity);
  //
  //         Object.entries(evt.data[networkId]).forEach(
  //           ([componentName, componentData]) => {
  //             const component = components.find(
  //               (c) => c[COMPONENT_TYPE].name === componentName
  //             );
  //             if (!component) {
  //               console.warn(
  //                 `[network_update] Component ${componentName} not found on entity ${entity}`
  //               );
  //               return;
  //             }
  //
  //             Object.assign(component, componentData);
  //           }
  //         );
  //       });
  //     },
  //
  //     input(_: TransportEvent): void {
  //       // client should not get input events
  //     },
  //     spawn_request(_: TransportEvent): void {
  //       // client should not get spawn requests
  //     },
  //   };
  //
  //   matchEventType[message.eventType](message);
  // });
}
