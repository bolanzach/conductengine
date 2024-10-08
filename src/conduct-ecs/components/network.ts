import { Component } from '../component';

export type NetworkAuthority = 'client' | 'server';

export const NETWORK_ID = Symbol('NETWORK_ID');

let networkIdCounter = 0;

export function getNextNetworkId() {
  return networkIdCounter++;
}

export abstract class NetworkedComponent extends Component {
  readonly [NETWORK_ID]: number = Infinity;
}

export class Network extends NetworkedComponent {
  // readonly authority!: NetworkAuthority;
  readonly bundle!: string;
  // isSpawned = false;
}
