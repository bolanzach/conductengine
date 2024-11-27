import { Query } from "@/conduct-ecs";
import PerformanceTestTwoComponent from "@/game/src/components/performanceTestTwoComponent";

export default function PerformanceTestTwoSystem(
  query: Query<[PerformanceTestTwoComponent]>
) {
  query.iter(([_, two]) => {
    two.value += two.value;
  });
}
