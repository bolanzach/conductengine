import { Query } from "@/conduct-ecs";
import { InputState } from "@/conduct-ecs/state/client/inputState";

export default function InputSystem(query: Query<[]>) {
  const input = query.world.getState(InputState);
  input.flush();
}
