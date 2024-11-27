import { Query } from "@/conduct-ecs";
import PerformanceTestOneComponent from "@/game/src/components/performanceTestOneComponent";

export default function PerformanceTestOneSystem(
  query: Query<[PerformanceTestOneComponent]>
) {
  query.components(([entity, componentOne]) => {
    componentOne.value += entity;
  });
}
