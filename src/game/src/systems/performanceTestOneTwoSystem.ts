import { Query } from "@/conduct-ecs";
import PerformanceTestOneComponent from "@/game/src/components/performanceTestOneComponent";
import PerformanceTestTwoComponent from "@/game/src/components/performanceTestTwoComponent";

export default function PerformanceTestOneTwoSystem(
  query: Query<[PerformanceTestOneComponent, PerformanceTestTwoComponent]>
) {
  query.iter(([_, pos, phys]) => {
    // Apply friction scaled by mass
    const drag = phys.friction / phys.mass;
    pos.vx *= drag;
    pos.vy *= drag;
    pos.vz *= drag;
  });
}
