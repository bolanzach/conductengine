import "reflect-metadata";

import { loadClientModule } from "@/conduct-core/loadModule";
import { World } from "@/conduct-ecs";
import CameraComponent from "@/conduct-ecs/components/cameraComponent";
import EventComponent from "@/conduct-ecs/components/eventComponent";
import RenderComponent from "@/conduct-ecs/components/renderComponent";
import Transform3DComponent from "@/conduct-ecs/components/transformComponent";
import squareBundle from "@/game/src/bundles/square";
import TestComponent from "@/game/src/components/testComponent";
import TestTwoComponent from "@/game/src/components/testTwoComponent";
import TestSystem from "@/game/src/systems/testSystem";
import TestThreeSystem from "@/game/src/systems/testSystemThree";
import TestTwoSystem from "@/game/src/systems/testSystemTwo";

export default async function MainGameStartInitSystem(world: World) {
  console.log("GAME INIT");

  world
    .registerSystem(TestSystem)
    .registerSystem(TestTwoSystem)
    .registerSystem(TestThreeSystem);

  // camera
  world.addEntity().add(CameraComponent, {}).add(Transform3DComponent, {});

  // for (let i = 0; i < 40_000; i++) {
  //   world
  //     .addEntity()
  //     .add(TestComponent, { value: i })
  //     .add(TestTwoComponent, {});
  // }
  //
  // for (let i = 0; i < 10_000; i++) {
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

  squareBundle(world);

  world.start();
}
