import { Query } from "@/conduct-ecs";
import EventComponent from "@/conduct-ecs/components/eventComponent";
import { EventEmitter, EventReceiver, EVENTS } from "@/conduct-ecs/event";
import { createState } from "@/conduct-ecs/state";
import { PrivateEventBufferState } from "@/conduct-ecs/systems/eventInitSystem";

export const EventState = createState<EventReceiver & EventEmitter>();

export default function EventSystem(query: Query<[EventComponent]>) {
  const eventBufferState = query.world.getState(PrivateEventBufferState);
  const { currentEvents } = eventBufferState;

  currentEvents.clear();
  eventBufferState.futureEvents.forEach((event) => {
    const existing = currentEvents.get(event.event) ?? [];
    currentEvents.set(event.event, [...existing, event.data]);
  });
  eventBufferState.futureEvents = [];

  for (const [_, event] of query) {
    event[EVENTS] = currentEvents;
  }
}
