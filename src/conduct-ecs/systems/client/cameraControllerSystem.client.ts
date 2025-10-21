import { vec3 } from "gl-matrix";

import { Query } from "@/conduct-ecs";
import CameraComponent from "@/conduct-ecs/components/cameraComponent";
import Transform3DComponent from "@/conduct-ecs/components/transformComponent";
import { CameraControllerState } from "@/conduct-ecs/systems/client/cameraControllerInitSystem.client";

export default function CameraControllerSystem(
  query: Query<[CameraComponent, Transform3DComponent]>
) {
  const state = query.world.getState(CameraControllerState);

  query.iter(([_, camera, transform]) => {
    if (state.panDeltaX !== 0 || state.panDeltaY !== 0) {
      const right = vec3.create();
      const up = vec3.fromValues(0, 1, 0);
      const forward = vec3.create();

      vec3.subtract(
        forward,
        camera.lookAt,
        vec3.fromValues(transform.x, transform.y, transform.z)
      );
      vec3.normalize(forward, forward);

      vec3.cross(right, forward, up);
      vec3.normalize(right, right);

      const panX = state.panDeltaX * state.panSpeed;
      const panY = state.panDeltaY * state.panSpeed;

      transform.x -= right[0] * panX;
      transform.y += panY;
      transform.z -= right[2] * panX;

      camera.lookAt[0] -= right[0] * panX;
      camera.lookAt[1] += panY;
      camera.lookAt[2] -= right[2] * panX;

      state.panDeltaX = 0;
      state.panDeltaY = 0;
    }

    if (state.zoomDelta !== 0) {
      const forward = vec3.create();
      vec3.subtract(
        forward,
        camera.lookAt,
        vec3.fromValues(transform.x, transform.y, transform.z)
      );

      const distance = vec3.length(forward);
      vec3.normalize(forward, forward);

      const zoomAmount = state.zoomDelta * state.zoomSpeed * 0.01;
      const newDistance = Math.max(
        state.minZoom,
        Math.min(state.maxZoom, distance + zoomAmount * distance)
      );

      const scaleFactor = (distance - newDistance) / distance;
      transform.x += forward[0] * scaleFactor * distance;
      transform.y += forward[1] * scaleFactor * distance;
      transform.z += forward[2] * scaleFactor * distance;

      state.zoomDelta = 0;
    }
  });
}
