import { NetworkTransport } from "../../conduct-core/networkTransport";
import { Component, COMPONENT_TYPE } from "../component";
import {
  isNetworkedComponent,
  Network,
  NETWORK_ID,
  NetworkedComponent,
} from "../components/network";
import {
  EVENT_COMPONENT_ADDED,
  EVENT_ENTITY_DESTROY,
  EventEmitter,
  EventReceiver,
} from "../event";
import { Query, System, SystemParams } from "../system";

// const getAuthority = (): NetworkAuthority => {
//   try {
//     return process && process.env ? 'server' : 'client';
//   } catch (_) {
//     return 'client';
//   }
// };

export default class NetworkSystem implements System {
  private componentUpdateBuffer: Record<number, Record<string, object>> = {};
  private static networkIdCounter = 0;

  private lastUpdate = 0;

  constructor(
    private networkTransport: NetworkTransport,
    isServer: boolean,
    events: EventEmitter & EventReceiver
  ) {
    events.subscribe(({ event, data }) => {
      if (event === EVENT_COMPONENT_ADDED) {
        const { entity, component } = data;

        if (isServer) {
          // Register networked components on the server
          if (isNetworkedComponent(component)) {
            if (component instanceof Network) {
              // @ts-expect-error we have to assign the network id
              component[NETWORK_ID] = NetworkSystem.generateNextNetworkId();

              // Send a network event to the client to spawn the bundle
              networkTransport.produceNetworkEvent({
                data: {
                  bundle: component.bundle,
                  networkId: component[NETWORK_ID],
                },
                sender: 0,
                eventType: "spawn",
              });
            } else {
              this.registerNetworkComponent(
                component[NETWORK_ID],
                component as NetworkedComponent
              );
            }
          }
        } else if (component instanceof Network) {
          // Client cannot spawn networked components. Request the server to spawn it.
          networkTransport.produceNetworkEvent({
            data: {
              bundle: component.bundle,
            },
            sender: 0,
            eventType: "spawn_request",
          });
          events.publish({
            event: EVENT_ENTITY_DESTROY,
            data: { entity },
          });
        }
      }
    });
  }

  static generateNextNetworkId() {
    return NetworkSystem.networkIdCounter++;
  }

  @Query()
  update({ entity, time, world }: SystemParams, networkComponent: Network) {
    // const isServer = world.gameHostType === "server";

    // if (!isServer) {
    //   if (networkComponent[NETWORK_ID] === Infinity) {
    //     // Client cannot spawn networked components. Request the server to spawn it.
    //     this.networkTransport.produceNetworkEvent({
    //       data: {
    //         bundle: networkComponent.bundle,
    //       },
    //       sender: 0,
    //       eventType: "spawn_request",
    //     });
    //
    //     world.destroyEntity(entity);
    //   }
    //
    //   return;
    // }

    /* Everything below here is server-side logic */

    // let networkId = networkComponent[NETWORK_ID];
    // // const components = world.getAllComponentsForEntity(entity);
    // // const networkedComponents = components.filter(isNetworkedComponent);
    //
    // // Set up the new networked component
    // if (networkId === Infinity) {
    //   networkId = NetworkSystem.generateNextNetworkId();
    //   // @ts-expect-error we have to assign the network id
    //   networkComponent[NETWORK_ID] = networkId;
    //
    //   // Send a network event to the client to spawn the bundle
    //   this.networkTransport.produceNetworkEvent({
    //     data: {
    //       bundle: networkComponent.bundle,
    //       networkId: networkComponent[NETWORK_ID],
    //     },
    //     sender: 0,
    //     eventType: "spawn",
    //   });
    // }

    // // Register any new networked components
    // networkedComponents
    //   .filter((c) => c[NETWORK_ID] === Infinity)
    //   .forEach((c) => {
    //     // @ts-expect-error we have to assign the network id
    //     c[NETWORK_ID] = NetworkSystem.generateNextNetworkId();
    //     this.registerNetworkComponent(networkId, c);
    //   });

    // Send update events for all networked components
    if (time.timestamp - this.lastUpdate >= 100) {
      this.publishNetworkUpdates();
      this.lastUpdate = time.timestamp;
    }
  }

  private registerNetworkComponent(
    networkId: number,
    component: NetworkedComponent
  ) {
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
              //component[NETWORK_ID],
              networkId,
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
    const prevState = this.componentUpdateBuffer[networkId] || {};
    const prevComponentState = prevState[componentName] || {};
    const updatedState = {
      ...prevState,
      [componentName]: {
        ...prevComponentState,
        [key]: newValue,
      },
    };

    this.componentUpdateBuffer[networkId] = updatedState;
  }

  private publishNetworkUpdates() {
    if (Object.keys(this.componentUpdateBuffer).length === 0) {
      return;
    }

    this.networkTransport.produceNetworkEvent({
      eventType: "update",
      sender: 0,
      data: this.componentUpdateBuffer,
    });

    this.componentUpdateBuffer = {};

    // or do we send each one individually?
  }
}
