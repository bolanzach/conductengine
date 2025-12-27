import type { ConductEvent, EventManager } from "@/conduct-ecs/event";

declare global {
  interface Window {
    $conductengine?: {
      events?: EventManager;
    };
  }
}

function createEventStore() {
  let events = $state<ConductEvent[]>([]);
  let eventManager: EventManager | null = null;

  function init() {
    eventManager = window.$conductengine?.events ?? null;

    // if (eventManager) {
    //   eventManager.subscribe((event: ConductEvent) => {
    //     events = [...events, event];
    //   });
    // }
  }

  function getEventManager(): EventManager | null {
    if (!eventManager) {
      init();
    }
    return eventManager;
  }

  function subscribe(callback: (data: ConductEvent) => void): void {
    const manager = getEventManager();
    if (manager) {
      manager.subscribe(callback);
    }
  }

  function publish(event: ConductEvent): void {
    const manager = getEventManager();
    if (manager) {
      manager.publish(event);
    }
  }

  function clearEvents(): void {
    events = [];
  }

  return {
    get events() {
      return events;
    },
    get eventManager() {
      return getEventManager();
    },
    init,
    subscribe,
    publish,
    clearEvents,
  };
}

export const eventStore = createEventStore();
