import { NetworkTransport } from '../../conduct-core/networkTransport';
import { Component } from '../component';
import {
  getNextNetworkId,
  Network,
  NETWORK_ID,
  NetworkAuthority,
  NetworkedComponent,
} from '../components/network';
import { Query, System, SystemParams } from '../system';

const getAuthority = (): NetworkAuthority => {
  try {
    return process && process.env ? 'server' : 'client';
  } catch (_) {
    return 'client';
  }
};

export default class NetworkSystem implements System {
  private componentUpdateBuffer: Record<number, object> = {};

  private count = 0;

  constructor(
    private networkTransport: NetworkTransport,
    private isAuthority: boolean
  ) {
    networkTransport.registerNetworkHandler((message) => {
      console.dir(message);
      // if (message.data.type === 'spawn') {
      //   console.log('spawn message');
      //   // const networkComponent = message.data.components[0];
      //   // const bundle = networkComponent.bundle;
      //   // const idk = w.buildBundle(bundle, networkComponent);
      //   // console.log(idk);
      // }
    });
  }

  @Query()
  update({ entity, world }: SystemParams, networkComponent: Network) {
    const components = world.getAllComponentsForEntity(entity);
    const networkedComponents = components.filter(
      NetworkSystem.isNetworkedComponent
    ) as NetworkedComponent[];

    const sendSpawnMessage =
      networkComponent[NETWORK_ID] === Infinity && this.isAuthority;

    // Register any new networked components
    networkedComponents
      .filter((c) => c[NETWORK_ID] === Infinity)
      .forEach((c) => {
        // @ts-expect-error we have to reassign the network id
        c[NETWORK_ID] = getNextNetworkId();
        this.registerNetworkComponent(c);
      });

    if (sendSpawnMessage) {
      this.networkTransport.produceNetworkEvent({
        sender: 0,
        type: 'spawn_network_component',
        data: {
          components: [networkComponent, ...networkedComponents],
        },
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

  registerNetworkComponent(component: NetworkedComponent) {
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

  handleInternalNetworkPropertyChange(
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

  publishNetworkUpdates() {
    const message = {
      type: 'update',
      components: this.componentUpdateBuffer,
    };
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
