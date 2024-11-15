import "reflect-metadata";

import loadModule from "@/conduct-core/loadModule";
import { World } from "@/conduct-ecs";
import CameraComponent from "@/conduct-ecs/components/cameraComponent";
import EventComponent from "@/conduct-ecs/components/eventComponent";
import RenderComponent from "@/conduct-ecs/components/renderComponent";
import Transform3DComponent from "@/conduct-ecs/components/transformComponent";
import type * as WebGpuRendererSystemModule from "@/conduct-ecs/systems/client/render/webGpuRendererSystem.client";
import TestComponent from "@/game/src/components/testComponent";
import TestTwoComponent from "@/game/src/components/testTwoComponent";
import TestSystem from "@/game/src/systems/testSystem";
import TestThreeSystem from "@/game/src/systems/testSystemThree";
import TestTwoSystem from "@/game/src/systems/testSystemTwo";

export default async function MainGameStartInitSystem(world: World) {
  console.log("GAME INIT");

  const webGpuRendererClientModule = await loadModule<
    typeof WebGpuRendererSystemModule
  >("@/conduct-ecs/systems/client/render/webGpuRendererSystem.client");

  world
    .registerSystem(TestSystem)
    .registerSystem(TestTwoSystem)
    .registerSystem(TestThreeSystem);

  world.addEntity().add(CameraComponent, {}).add(Transform3DComponent, {});

  world
    .addEntity()
    .add(Transform3DComponent, {})
    .add(
      RenderComponent,
      webGpuRendererClientModule?.initRenderComponent || {}
    );

  // world.registerBundle(new PlayerBundle());

  world.start();
}
