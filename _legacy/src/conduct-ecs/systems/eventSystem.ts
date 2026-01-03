import { Query } from "@/conduct-ecs";
import {
  ConductEvent,
  ConductEventId,
  ConductEventsRegistry,
  EventManager,
} from "@/conduct-ecs/event";
import { createState } from "@/conduct-ecs/state";

export class EventStateImpl {
  #eventManger: EventManager;
  futureEvents: ConductEvent[] = [];
  currentEvents = new Map<ConductEventId, unknown[]>();

  constructor(eventManager: EventManager) {
    this.#eventManger = eventManager;
    this.#eventManger.subscribe(ConductEventsRegistry.AllEvents, (event) => {
      this.futureEvents.push(event);
    });
  }

  publish(event: ConductEvent): void {
    this.#eventManger.publish(event);
  }

  subscribe(id: ConductEventId, callback: (data: ConductEvent) => void): void {
    this.#eventManger.subscribe(id, callback);
  }
}

export const EventState = createState<EventStateImpl>();

export function createEventBufferState() {
  return {
    futureEvents: [] as ConductEvent[],
    currentEvents: new Map(),
  };
}

export default function EventSystem(query: Query<[]>) {
  const eventState = query.world.getState(EventState);
  const { currentEvents } = eventState;

  currentEvents.clear();
  eventState.futureEvents.forEach((event) => {
    const existing = currentEvents.get(event.event) ?? [];
    currentEvents.set(event.event, [...existing, event.data]);
  });
  eventState.futureEvents = [];

  // query.iter(([_, event]) => {
  //   event[EVENTS] = currentEvents;
  // });
}
