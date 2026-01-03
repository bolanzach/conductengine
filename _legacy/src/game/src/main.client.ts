import { World } from "@/conduct-ecs";
import CameraControllerSystem from "@/conduct-ecs/systems/client/cameraControllerSystem.client";
import TestSystem from "@/game/src/systems/testSystem";

/**
 * Client specific setup
 */
export function setupClient(world: World) {
  world.registerSystem(CameraControllerSystem).registerSystem(TestSystem);
}
