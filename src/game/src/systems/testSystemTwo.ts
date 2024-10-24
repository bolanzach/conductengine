import { SystemParams } from "@/conduct-ecs";
import TestComponent from "@/game/src/components/testComponent";

export default function TestTwoSystem(
  { world }: SystemParams,
  one: TestComponent
) {
  const e = world.createEntity();
  // world.addComponentToEntity(e, TestComponent, {
  //   value: one.value,
  // });
}
