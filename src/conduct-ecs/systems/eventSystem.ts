import EventComponent, {
  EVENTS,
} from "@/conduct-ecs/components/eventComponent";
import { ConductEvent } from "@/conduct-ecs/event";
import { SystemParams } from "@/conduct-ecs/system";

let lastTick = -Infinity;
const currentEvents = new Map<number, any[]>();
let futureEvents: ConductEvent[] = [];

export default function EventSystem(
  { time }: SystemParams,
  events: EventComponent
) {
  if (time.tick > lastTick) {
    lastTick = time.tick;
    currentEvents.clear();
    futureEvents.forEach((event) => {
      const existing = currentEvents.get(event.event) ?? [];
      currentEvents.set(event.event, [...existing, event.data]);
    });
    futureEvents = [];
  }

  events[EVENTS] = currentEvents;
}
