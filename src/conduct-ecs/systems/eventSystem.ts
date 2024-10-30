import EventComponent, {
  EVENTS,
} from "@/conduct-ecs/components/eventComponent";
import { EventEmitter, EventReceiver } from "@/conduct-ecs/event";
import { createState } from "@/conduct-ecs/state";
import { SystemParams } from "@/conduct-ecs/system";
import { PrivateEventBufferState } from "@/conduct-ecs/systems/eventInitSystem";

export const EventState = createState<EventReceiver & EventEmitter>();

export default function EventSystem(
  { world, time }: SystemParams,
  events: EventComponent
) {
  const eventBufferState = world.getState(PrivateEventBufferState);
  const { currentEvents } = eventBufferState;

  if (eventBufferState.lastTick < time.tick) {
    eventBufferState.lastTick = time.tick;
    currentEvents.clear();
    eventBufferState.futureEvents.forEach((event) => {
      const existing = currentEvents.get(event.event) ?? [];
      currentEvents.set(event.event, [...existing, event.data]);
    });
    eventBufferState.futureEvents = [];
  }

  events[EVENTS] = currentEvents;
}
