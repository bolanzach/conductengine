import { Query } from "@/conduct-ecs";
import PerformanceTestThreeComponent from "@/game/src/components/performanceTestThreeComponent";

export default function PerformanceTestThreeSystem(
  query: Query<[PerformanceTestThreeComponent]>
) {
  query.components(([_, three]) => {
    three.value++;
  });
}
