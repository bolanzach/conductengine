import { Query } from "@/conduct-ecs";
import PerformanceTestOneComponent from "@/game/src/components/performanceTestOneComponent";

export default function PerformanceTestOneSystem(
  query: Query<[PerformanceTestOneComponent]>
) {
  query.iter(([entity, componentOne]) => {
    componentOne.value += entity;
  });
}
