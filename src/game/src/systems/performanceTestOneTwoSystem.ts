import { Query } from "@/conduct-ecs";
import PerformanceTestOneComponent from "@/game/src/components/performanceTestOneComponent";
import PerformanceTestTwoComponent from "@/game/src/components/performanceTestTwoComponent";

export default function PerformanceTestOneTwoSystem(
  query: Query<[PerformanceTestOneComponent, PerformanceTestTwoComponent]>
) {
  query.iter(([_, one, two]) => {
    one.value += two.value;
  });
}
