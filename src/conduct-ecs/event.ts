import EventComponent from "@/conduct-ecs/components/eventComponent";

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

export const EVENTS = Symbol("Events");

export class EventManager implements EventEmitter, EventReceiver {
  private subscriptions: ((data: ConductEvent) => void)[] = [];

  publish(event: ConductEvent): void {
    this.subscriptions.forEach((callback) => callback(event));
  }

  subscribe(callback: (data: ConductEvent) => void): void {
    this.subscriptions.push(callback);
  }
}

export function eventSubscribe(
  eventComponent: EventComponent,
  event: number,
  cb: (data: any) => void
): void {
  const eventsMap = eventComponent[EVENTS];
  if (!eventsMap) {
    return;
  }

  const events = eventsMap.get(event);
  if (events) {
    events
      .filter((e) => e.event === event)
      .forEach((e) => {
        cb(e.data);
      });
  }
}
