import { Query } from "@/conduct-ecs";
import TestTwoComponent from "@/game/src/components/testTwoComponent";

export default function TestTwoSystem(query: Query<[TestTwoComponent]>): void {
  for (const [_, testTwo] of query) {
    if (testTwo.value > 1_000) {
      testTwo.value = 0;
    }
    testTwo.value++;
  }
}
