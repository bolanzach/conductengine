import Events, { EVENTS } from "../components/events";
import { ConductEvent, EventReceiver } from "../event";
import { Query, System, SystemParams } from "../system";

export default class EventSystem implements System {
  private lastTick = -Infinity;

  private currentEvents = new Map<number, any[]>();
  private futureEvents: ConductEvent[] = [];

  constructor(eventReceiver: EventReceiver) {
    eventReceiver.subscribe((event) => {
      this.futureEvents.push(event);
    });
  }

  @Query()
  update({ time }: SystemParams, events: Events) {
    if (time.tick > this.lastTick) {
      this.lastTick = time.tick;
      this.currentEvents.clear();
      this.futureEvents.forEach((event) => {
        const existing = this.currentEvents.get(event.event) ?? [];
        this.currentEvents.set(event.event, [...existing, event.data]);
      });
      this.futureEvents = [];
    }

    events[EVENTS] = this.currentEvents;
  }
}
