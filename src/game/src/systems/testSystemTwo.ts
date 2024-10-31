import { Query } from "@/conduct-ecs/system";
import TestTwoComponent from "@/game/src/components/testTwoComponent";

export default function TestTwoSystem(_: Query<[TestTwoComponent]>): void {
  //const e = world.createEntity();
  // world.addComponentToEntity(e, TestComponent, {
  //   value: one.value,
  // });
}
