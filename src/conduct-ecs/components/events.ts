import { Component } from "../component";

export const EVENTS = Symbol("EVENTS");

export default class Events extends Component {
  [EVENTS]? = new Map<number, any[]>();
}

export function eventsSubscribe(
  eventComponent: Events,
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
