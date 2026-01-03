import { Query } from "@/conduct-ecs";
import PerformanceTestOneComponent from "@/game/src/components/performanceTestOneComponent";

export default function PerformanceTestOneSystem(
  query: Query<[PerformanceTestOneComponent]>
) {
  query.iter(([_, c]) => {
    c.x += c.vx;
    c.y += c.vy;
    c.z += c.vz;
  });
}
