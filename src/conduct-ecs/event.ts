export interface ConductEvent {
  event: number;
  data: any;
}

export interface EventEmitter {
  publish(event: ConductEvent): void;
}

export interface EventReceiver {
  subscribe(callback: (data: ConductEvent) => void): void;
}

export const EVENT_ENTITY_CREATED = 100;
export const EVENT_ENTITY_SPAWNED = 101;
export const EVENT_ENTITY_DESTROY = 105;
export const EVENT_COMPONENT_ADDED = 106;

export class EventManager implements EventEmitter, EventReceiver {
  private subscriptions: ((data: ConductEvent) => void)[] = [];

  publish(event: ConductEvent): void {
    this.subscriptions.forEach((callback) => callback(event));
  }

  subscribe(callback: (data: ConductEvent) => void): void {
    this.subscriptions.push(callback);
  }
}
