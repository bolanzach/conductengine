import "reflect-metadata";

import { World } from "@/conduct-ecs";
import CameraComponent from "@/conduct-ecs/components/cameraComponent";
import Transform3DComponent from "@/conduct-ecs/components/transformComponent";
import cubeBundle from "@/game/src/bundles/cube";
import MoveSquareSystem from "@/game/src/systems/moveSquareSystem";
import PerformanceTestOneSystem from "@/game/src/systems/performanceTestOneSystem";
import PerformanceTestOneTwoSystem from "@/game/src/systems/performanceTestOneTwoSystem";
import PerformanceTestThreeSystem from "@/game/src/systems/performanceTestThreeSystem";
import PerformanceTestTwoSystem from "@/game/src/systems/performanceTestTwoSystem";

export default async function MainGameStartInitSystem(world: World) {
  console.log("GAME INIT");

  world
    .registerSystem(MoveSquareSystem)
    .registerSystem(PerformanceTestOneSystem)
    .registerSystem(PerformanceTestTwoSystem)
    .registerSystem(PerformanceTestThreeSystem)
    .registerSystem(PerformanceTestOneTwoSystem);

  // camera
  const aspect =
    world.gameHostType === "client"
      ? window.innerWidth / window.innerHeight
      : 16 / 9;
  world
    .addEntity()
    .add(CameraComponent, { aspect })
    .add(Transform3DComponent, { z: 10, y: 10 });

  cubeBundle(world);

  world.start();
}
