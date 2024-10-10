export interface TransportEvent {
  sender: number;
  receiver?: number;
  eventType: 'spawn_request' | 'spawn' | 'update';
  data: any;
}

export interface NetworkTransport {
  produceNetworkEvent(message: TransportEvent): void;
  registerNetworkHandler(cb: (message: TransportEvent) => void): void;
}
