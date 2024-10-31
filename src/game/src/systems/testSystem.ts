import { Component, ComponentType } from "@/conduct-ecs";
import { Query } from "@/conduct-ecs/system";
import TestComponent from "@/game/src/components/testComponent";
import TestTwoComponent from "@/game/src/components/testTwoComponent";

export default function TestSystem(
  query: Query<[TestComponent, TestTwoComponent]>
) {
  const { world } = query;
  for (const [entity, one] of query) {
    one.value++;
  }
}
