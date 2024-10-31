// import {
//   NetworkTransport,
//   TransportEvent,
// } from '../../conduct-core/networkTransport';
// import { COMPONENT_TYPE } from '../component';
// import { isNetworkComponent, NETWORK_ID } from '../components/network';
// import { Entity } from '../entity';
// import { SystemInit } from '../system';
// import { World } from '../world';
//
// export default class ClientNetworkSystem implements SystemInit {
//   // Mapping of networkId to Entity
//   private networkEntityMapping: [number, Entity][] = [];
//
//   constructor(private networkTransport: NetworkTransport) {}
//
//   init(world: World) {
//     const canvas = document.getElementById('canvas');
//     if (!canvas) {
//       throw new Error('Canvas not found');
//     }
//
//     canvas.addEventListener('mousedown', (e) => {
//       this.networkTransport.produceNetworkEvent({
//         eventType: 'input',
//         sender: 0,
//         data: {
//           input: 'mousedown',
//         },
//       });
//     });
//
//     const { networkTransport, networkEntityMapping } = this;
//     networkTransport.registerNetworkHandler((message) => {
//       const matchEventType: Record<
//         TransportEvent['eventType'],
//         (evt: TransportEvent) => void
//       > = {
//         spawn(evt: TransportEvent): void {
//           const entity = world.spawnBundle(evt.data.bundle);
//           const components = world.getAllComponentsForEntity(entity);
//
//           components.forEach((component) => {
//             if (isNetworkComponent(component)) {
//               const networkId = evt.data.networkId;
//               // @ts-expect-error we have to update the network_id here
//               component[NETWORK_ID] = networkId;
//               networkEntityMapping.push([networkId, entity]);
//             }
//           });
//         },
//         update(evt: TransportEvent): void {
//           Object.keys(evt.data).forEach((networkId) => {
//             const mapping = networkEntityMapping.find(
//               ([id]) => id === parseInt(networkId, 10)
//             );
//             if (!mapping) {
//               return;
//             }
//
//             const [_, entity] = mapping;
//             const components = world.getAllComponentsForEntity(entity);
//
//             Object.entries(evt.data[networkId]).forEach(
//               ([componentName, componentData]) => {
//                 const component = components.find(
//                   (c) => c[COMPONENT_TYPE].name === componentName
//                 );
//                 if (!component) {
//                   console.warn(
//                     `[network_update] Component ${componentName} not found on entity ${entity}`
//                   );
//                   return;
//                 }
//
//                 Object.assign(component, componentData);
//               }
//             );
//           });
//         },
//         input(_: TransportEvent): void {
//           // client should not get input events
//         },
//         spawn_request(_: TransportEvent): void {
//           // client should not get spawn requests
//         },
//       };
//
//       matchEventType[message.eventType](message);
//     });
//   }
// }
