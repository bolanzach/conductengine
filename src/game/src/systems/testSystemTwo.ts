import { SystemParams } from "@/conduct-ecs";
import TestTwoComponent from "@/game/src/components/testTwoComponent";

export default function TestTwoSystem(
  { world }: SystemParams,
  one: TestTwoComponent
) {
  //const e = world.createEntity();
  // world.addComponentToEntity(e, TestComponent, {
  //   value: one.value,
  // });
}
