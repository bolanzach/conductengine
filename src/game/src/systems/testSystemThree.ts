import { Query } from "@/conduct-ecs";
import EventComponent from "@/conduct-ecs/components/eventComponent";
import { eventSubscribe } from "@/conduct-ecs/event";
import TestComponent from "@/game/src/components/testComponent";
import TestTwoComponent from "@/game/src/components/testTwoComponent";

export default function TestThreeSystem(
  query: Query<[TestTwoComponent, TestComponent, EventComponent]>
): void {
  // for (const [_, testTwo, test, event] of query.components) {
  //   // testTwo.value += test.value;
  //   // test.value += testTwo.value;
  //
  //   eventSubscribe(event, 69, (_) => {
  //     //
  //   });
  // }
}
