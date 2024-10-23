import {
  NetworkTransport,
  TransportEvent,
} from "../../conduct-core/networkTransport";
import Input, { INPUT_EVENT } from "../components/input";
import { Query, System, SystemParams } from "../system";

export default class ServerInputSystem implements System {
  private eventBuffer: TransportEvent[] = [];
  private currentEvent?: TransportEvent;
  private tick = -Infinity;

  constructor(networkTransport: NetworkTransport) {
    networkTransport.registerNetworkHandler((message) => {
      if (message.eventType === "input") {
        this.eventBuffer.push(message);
      }
    });
  }

  /**
   * Set the current I/O event from the network.
   * Note that the Network is not required because it's assumed that a system
   * reading from Input does not need to know whether the input is from the
   * network or not.
   */
  @Query()
  update({ time }: SystemParams, input: Input) {
    if (time.tick > this.tick) {
      this.tick = time.tick;
      this.currentEvent = this.eventBuffer.shift();
    }

    input[INPUT_EVENT] = this.currentEvent?.data;
  }
}
