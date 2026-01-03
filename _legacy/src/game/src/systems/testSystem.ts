import { Not, Query } from "@/conduct-ecs";
import {
  InputKeyMouseLeft,
  InputState,
} from "@/conduct-ecs/state/client/inputState";
import TestComponent from "@/game/src/components/testComponent";
import TestTwoComponent from "@/game/src/components/testTwoComponent";

// Example: Query entities with TestComponent but NOT TestTwoComponent
export default function TestSystem(
  query: Query<[TestComponent, Not<[TestTwoComponent]>]>
) {
  const { world } = query;
  const input = world.getState(InputState);

  query.iter(([entity, _]) => {
    console.log("Entity", entity, "has TestComponent but NOT TestTwoComponent");
  });

  if (input.isPressed(InputKeyMouseLeft)) {
    console.log(true);
  }
}
