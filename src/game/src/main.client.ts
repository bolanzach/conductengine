import { World } from "@/conduct-ecs";
import {
  CameraController,
  CameraControllerState,
} from "@/conduct-ecs/systems/client/cameraControllerInitSystem.client";
import { CameraControllerInitSystem } from "@/conduct-ecs/systems/client/cameraControllerInitSystem.client";
import CameraControllerSystem from "@/conduct-ecs/systems/client/cameraControllerSystem.client";

/**
 * Client specific setup
 */
export function setupClient(world: World) {
  world
    .registerState(CameraControllerState, CameraController)

    .registerSystem(CameraControllerSystem)

    .registerSystemInit(CameraControllerInitSystem);
}
