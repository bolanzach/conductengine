import { World } from "@/conduct-ecs";
import { ConductEvent } from "@/conduct-ecs/event";
import { createState } from "@/conduct-ecs/state";
import { EventState } from "@/conduct-ecs/systems/eventSystem";

export const PrivateEventBufferState = createState<{
  futureEvents: ConductEvent[];
  currentEvents: Map<number, any[]>;
}>();

export function createEventBufferState() {
  return {
    futureEvents: [] as ConductEvent[],
    currentEvents: new Map(),
  };
}

export default function EventInitSystem(world: World) {
  const eventBuffer = world.getState(PrivateEventBufferState);

  world.getState(EventState).subscribe((event) => {
    eventBuffer.futureEvents.push(event);
  });
}
