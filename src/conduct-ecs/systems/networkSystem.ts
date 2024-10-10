import { NetworkTransport } from '../../conduct-core/networkTransport';
import { Component } from '../component';
import {
  getNextNetworkId,
  Network,
  NETWORK_ID,
  NetworkedComponent,
} from '../components/network';
import { Query, System, SystemParams } from '../system';

// const getAuthority = (): NetworkAuthority => {
//   try {
//     return process && process.env ? 'server' : 'client';
//   } catch (_) {
//     return 'client';
//   }
// };

// export class NetworkSystemInit implements SystemInit {
//   constructor(private networkTransport: NetworkTransport) {}
//
//   init(_: World) {
//     //
//   }
//
//   produceNetworkEvent(message: TransportEvent): void {}
//
//   registerNetworkHandler(cb: (message: TransportEvent) => void): void {}
// }

export default class NetworkSystem implements System {
  private componentUpdateBuffer: Record<number, object> = {};

  private count = 0;

  constructor(private networkTransport: NetworkTransport) {}

  @Query()
  update({ entity, world }: SystemParams, networkComponent: Network) {
    if (
      world.gameHostType === 'client' &&
      !this.networkTransport.isNetworked(networkComponent[NETWORK_ID])
    ) {
      // Client cannot spawn networked components. Request the server to spawn it.
      this.networkTransport.produceNetworkEvent({
        data: {
          bundle: networkComponent.bundle,
        },
        sender: 0,
        eventType: 'spawn_request',
      });
      world.destroyEntity(entity);
      return;
    }

    const components = world.getAllComponentsForEntity(entity);
    const networkedComponents = components.filter(
      NetworkSystem.isNetworkedComponent
    ) as NetworkedComponent[];

    const sendSpawnMessage =
      networkComponent[NETWORK_ID] === Infinity &&
      world.gameHostType === 'server';

    // Register any new networked components
    networkedComponents
      .filter((c) => c[NETWORK_ID] === Infinity)
      .forEach((c) => {
        // @ts-expect-error we have to reassign the network id
        c[NETWORK_ID] = getNextNetworkId();
        this.registerNetworkComponent(c);
      });

    if (sendSpawnMessage) {
      // Send a network event to the client to spawn the bundle
      this.networkTransport.produceNetworkEvent({
        data: {
          bundle: networkComponent.bundle,
          networkId: networkComponent[NETWORK_ID],
        },
        sender: 0,
        eventType: 'spawn',
      });
    }

    // testing
    if (this.count >= 50) {
      this.publishNetworkUpdates();
      this.count = 0;
    }
    this.count++;

    // if (!networkComponent.isSpawned) {
    //   if (networkComponent.authority === getAuthority()) {
    //     networkComponent.isSpawned = true;
    //
    //     // Send spawn message
    //     this.wsConnection.send(
    //       JSON.stringify({
    //         type: 'spawn',
    //         components: [networkComponent, ...networkedComponents],
    //       })
    //     );
    //   } else {
    //     // Temporary - remove the Entity because this is not the authority
    //     //world.destroyEntity(entity);
    //   }
    // } else {
    //   // The object is spawned
    //
    //   if (networkComponent.authority === getAuthority()) {
    //     // Send update message
    //     this.wsConnection.send(
    //       JSON.stringify({
    //         type: 'update',
    //         components: [networkComponent, ...networkedComponents],
    //       })
    //     );
    //   }
    // }
  }

  private registerNetworkComponent(component: NetworkedComponent) {
    let { handleInternalNetworkPropertyChange } = this;
    handleInternalNetworkPropertyChange =
      handleInternalNetworkPropertyChange.bind(this);

    // For each property on the networked component
    Object.keys(component).forEach((key) => {
      // @ts-expect-error this is fine.
      let value = component[key];
      const networkId = component[NETWORK_ID];

      // Define a getter and setter for the property to capture changes
      Object.defineProperty(component, key, {
        get() {
          return value;
        },
        set(newValue: any) {
          if (newValue !== value) {
            value = newValue;
            handleInternalNetworkPropertyChange(
              networkId,
              key,
              value,
              newValue
            );
          }
        },
      });
    });
  }

  private handleInternalNetworkPropertyChange(
    networkId: number,
    key: string,
    _: any,
    newValue: any
  ) {
    const prevState = this.componentUpdateBuffer[networkId] || {};
    this.componentUpdateBuffer[networkId] = {
      ...prevState,
      [key]: newValue,
    };
  }

  private publishNetworkUpdates() {
    // const message = {
    //   type: 'update',
    //   components: this.componentUpdateBuffer,
    // };
    //this.wsConnection.produceMessage(JSON.stringify(message));
    this.componentUpdateBuffer = {};
    // this.componentUpdateBuffer.forEach((data, networkId) => {
    //   console.log('Sending update for', networkId, data);
    //   // const componentUpdateBuffer = this.componentUpdateBuffer.get(networkId);
    //   // if (component) {
    //   //   this.wsConnection.send(
    //   //     JSON.stringify({
    //   //       type: 'update',
    //   //       networkId,
    //   //       component,
    //   //     })
    //   //   );
    //   // }
    // });
  }

  static isNetworkedComponent(component: Component) {
    return NETWORK_ID in component;
  }
}
