import { Component } from "../component";

export type NetworkAuthority = "client" | "server";

export const NETWORK_ID = Symbol("NETWORK_ID");

const networkIdCounter = 0;

export function isNetworkedComponent(
  component: Component
): component is NetworkedComponent {
  return NETWORK_ID in component;
}

export function isNetworkComponent(component: Component): component is Network {
  return component instanceof Network;
}

export abstract class NetworkedComponent extends Component {
  readonly [NETWORK_ID]: number = Infinity;
}

export class Network extends NetworkedComponent {
  readonly bundle: string = "";
}
