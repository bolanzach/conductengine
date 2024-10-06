import { Component, ComponentConstructor } from './component';

type NetworkControl = 'CLIENT' | 'SERVER';

export const NETWORK_ID = Symbol('NETWORK_ID');

let networkIdCounter = 0;

// for now we keep these in a map. A condensed array would be better
const producerNetworkedComponents = new Map<number, Component>();
const consumerNetworkedComponents = new Map<number, Component>();

const getHost = (): NetworkControl => {
  try {
    return process && process.env ? 'SERVER' : 'CLIENT';
  } catch (_) {
    return 'CLIENT';
  }
};

export function getNetworkId() {
  return networkIdCounter++;
}

export function isNetworkedComponent(component: Component) {
  return NETWORK_ID in component;
}

function networkedComponentDecorator<T extends new (...args: any[]) => object>(
  cstr: T
) {
  return class extends cstr {
    [NETWORK_ID]: number;

    constructor(..._: any[]) {
      super();
      this[NETWORK_ID] = networkIdCounter++;

      // if (control === getHost()) {
      //   // @ts-expect-error this is a component
      //   producerNetworkedComponents.set(this[NETWORK_ID], this);
      // } else {
      //   // @ts-expect-error this is a component
      //   consumerNetworkedComponents.set(this[NETWORK_ID], this);
      // }
      //
      // console.log(
      //   producerNetworkedComponents.size,
      //   consumerNetworkedComponents.size
      // );
    }
  };
}

export const Networked = networkedComponentDecorator;

export function updateNetwork() {}
