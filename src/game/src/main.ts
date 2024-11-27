import "reflect-metadata";

import { loadClientModule } from "@/conduct-core/loadModule";
import { World } from "@/conduct-ecs";
import CameraComponent from "@/conduct-ecs/components/cameraComponent";
import EventComponent from "@/conduct-ecs/components/eventComponent";
import Transform3DComponent from "@/conduct-ecs/components/transformComponent";
import squareBundle from "@/game/src/bundles/square";
import PerformanceTestOneComponent from "@/game/src/components/performanceTestOneComponent";
import PerformanceTestThreeComponent from "@/game/src/components/performanceTestThreeComponent";
import PerformanceTestTwoComponent from "@/game/src/components/performanceTestTwoComponent";
import TestComponent from "@/game/src/components/testComponent";
import TestTwoComponent from "@/game/src/components/testTwoComponent";
import PerformanceTestOneSystem from "@/game/src/systems/performanceTestOneSystem";
import PerformanceTestOneTwoSystem from "@/game/src/systems/performanceTestOneTwoSystem";
import PerformanceTestThreeSystem from "@/game/src/systems/performanceTestThreeSystem";
import PerformanceTestTwoSystem from "@/game/src/systems/performanceTestTwoSystem";
import TestSystem from "@/game/src/systems/testSystem";
import TestThreeSystem from "@/game/src/systems/testSystemThree";
import TestTwoSystem from "@/game/src/systems/testSystemTwo";

export default async function MainGameStartInitSystem(world: World) {
  console.log("GAME INIT");

  world
    .registerSystem(PerformanceTestOneSystem)
    .registerSystem(PerformanceTestTwoSystem)
    .registerSystem(PerformanceTestThreeSystem)
    .registerSystem(PerformanceTestOneTwoSystem);

  // camera
  // world.addEntity().add(CameraComponent, {}).add(Transform3DComponent, {});

  for (let i = 0; i < 1_000; i++) {
    world.addEntity().add(PerformanceTestOneComponent, { value: i });
  }
  for (let i = 0; i < 1_000; i++) {
    world.addEntity().add(PerformanceTestTwoComponent, { value: i });
  }
  for (let i = 0; i < 1_000; i++) {
    world.addEntity().add(PerformanceTestThreeComponent, { value: i });
  }
  for (let i = 0; i < 2_000; i++) {
    world
      .addEntity()
      .add(PerformanceTestOneComponent, { value: i })
      .add(PerformanceTestTwoComponent, { value: i });
  }

  // world
  //   .addEntity()
  //   .add(TestComponent, { value: 111 })
  //   .add(TestTwoComponent, {});
  //
  // world
  //   .addEntity()
  //   .add(TestComponent, { value: 222 })
  //   .add(TestTwoComponent, {});
  //
  // world
  //   .addEntity()
  //   .add(TestComponent, { value: 333 })
  //   .add(TestTwoComponent, {});

  // for (let i = 0; i < 40_000; i++) {
  //   world
  //     .addEntity()
  //     .add(TestComponent, { value: i })
  //     .add(TestTwoComponent, {});
  // }

  // for (let i = 0; i < 15_000; i++) {
  //   world.addEntity().add(TestTwoComponent, {});
  // }
  //
  // for (let i = 0; i < 20_000; i++) {
  //   world
  //     .addEntity()
  //     .add(TestComponent, { value: i })
  //     .add(EventComponent, {})
  //     .add(TestTwoComponent, {});
  // }
  //
  // squareBundle(world);

  world.start();
}
