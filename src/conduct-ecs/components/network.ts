import { BundleConstructor } from '../bundle';
import { Component } from '../component';

export class NetworkComponent extends Component {
  readonly networkId!: number;
  readonly authority!: 'client' | 'server';
  bundle!: string;
}
