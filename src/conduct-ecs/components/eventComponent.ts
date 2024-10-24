import { Component } from "@/conduct-ecs/component";

export const EVENTS = Symbol("Events");

export default class EventComponent extends Component {
  [EVENTS]? = new Map<number, any[]>();
}

export function eventsSubscribe(
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
