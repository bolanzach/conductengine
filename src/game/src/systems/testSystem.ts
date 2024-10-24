import { SystemParams } from "@/conduct-ecs";
import TestComponent from "@/game/src/components/testComponent";

export default function TestSystem(
  _: SystemParams,
  one: TestComponent,
  two: TestComponent
) {
  one.value += two.value;
}
