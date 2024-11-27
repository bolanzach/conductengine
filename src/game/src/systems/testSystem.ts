import { ComponentType } from "@/conduct-ecs";
import { Query } from "@/conduct-ecs";
import TestComponent from "@/game/src/components/testComponent";
import TestTwoComponent from "@/game/src/components/testTwoComponent";

export default function TestSystem(
  query: Query<[TestComponent, TestTwoComponent]>
) {
  for (let i = 0; i < 2_000; i++) {
    i + i + 5;
  }
  //const { world } = query;
  // for (const [test, testTwo] of query) {
  //   if (test.value > 100_00) {
  //     test.value = 0;
  //   }
  //   test.value += testTwo.value;
  // }
  //const components = query.components;
  // for (let i = 0; i < 5_000; i++) {
  //   const [a, b] = components.map((componentArray) => componentArray[i]);
  //
  //   if (a.value > 100_00) {
  //     a.value = 0;
  //   }
  //   a.value += b.value;
  // }
}
