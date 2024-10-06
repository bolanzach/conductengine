import { BundleConstructor } from '../bundle';
import { Component } from '../component';

export type NetworkAuthority = 'client' | 'server';

export class NetworkComponent extends Component {
  readonly networkId!: number;
  readonly authority!: NetworkAuthority;
  bundle!: string;
  isSpawned? = false;
}
