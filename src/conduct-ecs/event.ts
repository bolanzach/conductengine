import EventComponent from "@/conduct-ecs/components/eventComponent";

export type ConductEventId = number | symbol;

export interface ConductEvent {
  event: ConductEventId;
  data: unknown;
}

export type ConductEventCallback = (data: ConductEvent) => void;

export interface EventEmitter {
  publish(event: ConductEvent): void;
}

export interface EventReceiver {
  subscribe(id: ConductEventId, callback: ConductEventCallback): void;
}

export const ConductEventsRegistry = {
  AllEvents: Symbol("AllEvents"),
  EntityCreated: Symbol("EntityCreated"),
  EntitySpawned: Symbol("EntitySpawned"),
  EntityDestroyed: Symbol("EntityDestroyed"),
  ComponentAdded: Symbol("ComponentAdded"),
};

// export const EVENT_ENTITY_CREATED = 100;
// export const EVENT_ENTITY_SPAWNED = 101;
// export const EVENT_ENTITY_DESTROY = 105;
// export const EVENT_COMPONENT_ADDED = 106;

export const EVENTS = Symbol("Events");

export class EventManager implements EventEmitter, EventReceiver {
  #subscriptions = new Map<ConductEventId, Set<ConductEventCallback>>();

  publish(event: ConductEvent): void {
    const subscriptions = this.#subscriptions.get(event.event) ?? [];
    subscriptions.forEach((callback) => callback(event));

    // Notify AllEvents subscribers
    const allEventsSubscriptions =
      this.#subscriptions.get(ConductEventsRegistry.AllEvents) ?? [];
    allEventsSubscriptions.forEach((callback) => callback(event));
  }

  subscribe(id: ConductEventId, callback: ConductEventCallback): void {
    const subscriptions = this.#subscriptions.get(id);
    if (subscriptions) {
      subscriptions.add(callback);
    } else {
      this.#subscriptions.set(id, new Set([callback]));
    }
  }

  unsubscribe(id: ConductEventId, callback: ConductEventCallback): void {
    const subscriptions = this.#subscriptions.get(id);
    if (subscriptions) {
      subscriptions.delete(callback);
    }
  }
}

export function eventSubscribe(
  eventComponent: EventComponent,
  event: number,
  cb: ConductEventCallback
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
