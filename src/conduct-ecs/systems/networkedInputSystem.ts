import { NetworkTransport } from '../../conduct-core/networkTransport';
import Input from '../components/input';
import { Network } from '../components/network';
import { Query, System, SystemParams } from '../system';

export default class NetworkedInputSystem implements System {
  constructor(private networkTransport: NetworkTransport) {}

  @Query()
  update(params: SystemParams, input: Input, network: Network) {}
}
