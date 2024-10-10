import { NetworkTransport } from '../../conduct-core/networkTransport';
import { COMPONENT_TYPE } from '../component';
import {
  isNetworkedComponent,
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

export default class NetworkSystem implements System {
  private componentUpdateBuffer: Record<number, object> = {};
  private static networkIdCounter = 0;

  private count = 0;

  constructor(private networkTransport: NetworkTransport) {}

  static generateNextNetworkId() {
    return NetworkSystem.networkIdCounter++;
  }

  @Query()
  update({ entity, world }: SystemParams, networkComponent: Network) {
    const isServer = world.gameHostType === 'server';

    if (!isServer && networkComponent[NETWORK_ID] === Infinity) {
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
    const networkedComponents = components.filter(isNetworkedComponent);
    const sendSpawnMessage =
      networkComponent[NETWORK_ID] === Infinity && isServer;

    // Register any new networked components
    if (isServer) {
      networkedComponents
        .filter((c) => c[NETWORK_ID] === Infinity)
        .forEach((c) => {
          // @ts-expect-error we have to assign the network id
          c[NETWORK_ID] = NetworkSystem.generateNextNetworkId();
          this.registerNetworkComponent(c);
        });
    }

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

    // Maybe temporary
    // Could move this to a worker
    if (this.count >= 50) {
      this.publishNetworkUpdates();
      this.count = 0;
    }
    this.count++;
  }

  private registerNetworkComponent(component: NetworkedComponent) {
    let { handleInternalNetworkPropertyChange } = this;
    handleInternalNetworkPropertyChange =
      handleInternalNetworkPropertyChange.bind(this);

    // For each property on the networked component
    Object.keys(component).forEach((key) => {
      // @ts-expect-error this is fine.
      let value = component[key];

      // Define a getter and setter for the property to capture changes
      Object.defineProperty(component, key, {
        get() {
          return value;
        },
        set(newValue: any) {
          if (newValue !== value) {
            value = newValue;
            handleInternalNetworkPropertyChange(
              component[NETWORK_ID],
              component[COMPONENT_TYPE].name,
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
    componentName: string,
    key: string,
    _: any,
    newValue: any
  ) {
    const prevState = this.componentUpdateBuffer[networkId] || {
      ___componentName: componentName,
    };
    this.componentUpdateBuffer[networkId] = {
      ...prevState,
      [key]: newValue,
    };
  }

  private publishNetworkUpdates() {
    if (Object.keys(this.componentUpdateBuffer).length === 0) {
      return;
    }

    this.networkTransport.produceNetworkEvent({
      eventType: 'update',
      sender: 0,
      data: this.componentUpdateBuffer,
    });

    this.componentUpdateBuffer = {};

    // or do we send each one individually?
  }
}
