export interface TransportEvent {
  sender: number;
  receiver?: number;
  type: string;
  data: any;
}

export interface NetworkTransport {
  produceNetworkEvent(message: TransportEvent): void;
  registerNetworkHandler(cb: (message: TransportEvent) => void): void;
}
