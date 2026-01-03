import "reflect-metadata";

import { loadClientModule } from "@/conduct-core/loadModule";
import { World } from "@/conduct-ecs";
import CameraComponent from "@/conduct-ecs/components/cameraComponent";
import { CameraControlComponent } from "@/conduct-ecs/components/cameraControl";
import Transform3DComponent from "@/conduct-ecs/components/transformComponent";
import cubeBundle from "@/game/src/bundles/cube";
import PerformanceTestOneComponent from "@/game/src/components/performanceTestOneComponent";
import PerformanceTestTwoComponent from "@/game/src/components/performanceTestTwoComponent";
import TestComponent from "@/game/src/components/testComponent";
import type * as SetupClientModule from "@/game/src/main.client";
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

  if (world.gameHostType === "client") {
    const mod =
      await loadClientModule<typeof SetupClientModule>("src/main.client.ts");
    mod?.setupClient(world);
  }

  // 10k entities with just position/velocity
  for (let i = 0; i < 10_000; i++) {
    world.addEntity().add(PerformanceTestOneComponent, {
      x: Math.random() * 1000,
      y: Math.random() * 1000,
      z: Math.random() * 1000,
      vx: Math.random() * 2 - 1,
      vy: Math.random() * 2 - 1,
      vz: Math.random() * 2 - 1,
    });
  }

  // 10k entities with both components (tests 2-component query)
  for (let i = 0; i < 10_000; i++) {
    world
      .addEntity()
      .add(PerformanceTestOneComponent, {
        x: Math.random() * 1000,
        y: Math.random() * 1000,
        z: Math.random() * 1000,
        vx: Math.random() * 2 - 1,
        vy: Math.random() * 2 - 1,
        vz: Math.random() * 2 - 1,
      })
      .add(PerformanceTestTwoComponent, {
        mass: Math.random() * 10 + 1,
        friction: 0.95 + Math.random() * 0.04,
      });
  }

  // camera
  // const aspect =
  //   world.gameHostType === "client"
  //     ? window.innerWidth / window.innerHeight
  //     : 16 / 9;
  // world
  //   .addEntity()
  //   .add(CameraComponent, { aspect })
  //   .add(CameraControlComponent, {})
  //   .add(Transform3DComponent, { z: 10, y: 10 })
  //   .add(TestComponent, { value: 42 });
  //
  // cubeBundle(world);

  world.start();
}
