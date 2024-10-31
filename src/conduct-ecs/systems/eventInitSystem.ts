import { ConductEvent } from "@/conduct-ecs/event";
import { createState } from "@/conduct-ecs/state";
import { SystemParams } from "@/conduct-ecs/system";
import { EventState } from "@/conduct-ecs/systems/eventSystem";

export const PrivateEventBufferState = createState<{
  futureEvents: ConductEvent[];
  currentEvents: Map<number, any[]>;
  lastTick: number;
}>();

export function createEventBufferState() {
  return {
    futureEvents: [] as ConductEvent[],
    currentEvents: new Map(),
    lastTick: -Infinity,
  };
}

export default function EventInitSystem({ world }: SystemParams) {
  const eventBuffer = world.getState(PrivateEventBufferState);

  world.getState(EventState).subscribe((event) => {
    eventBuffer.futureEvents.push(event);
  });
}
