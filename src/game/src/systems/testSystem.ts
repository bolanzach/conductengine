/////
import { ComponentType } from "@/conduct-ecs";
/////
import { Query } from "@/conduct-ecs";
import {
  InputKeyMouseLeft,
  InputState,
} from "@/conduct-ecs/state/client/inputState";

export default function TestSystem({ world }: Query<[]>) {
  const input = world.getState(InputState);

  if (input.isPressed(InputKeyMouseLeft)) {
    console.log(true);
  }
}
