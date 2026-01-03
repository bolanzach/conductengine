import { Query } from "@/conduct-ecs";
import TestTwoComponent from "@/game/src/components/testTwoComponent";

export default function TestTwoSystem(query: Query<[TestTwoComponent]>): void {
  // for (const [_] of query.components) {
  // }
}
