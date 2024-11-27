import { Query } from "@/conduct-ecs";
import PerformanceTestThreeComponent from "@/game/src/components/performanceTestThreeComponent";

export default function PerformanceTestThreeSystem(
  query: Query<[PerformanceTestThreeComponent]>
) {
  query.iter(([_, three]) => {
    three.value++;
  });
}
