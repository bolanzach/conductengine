import { vec3 } from "gl-matrix";

import { Query } from "@/conduct-ecs";
import CameraComponent from "@/conduct-ecs/components/cameraComponent";
import { CameraControlComponent } from "@/conduct-ecs/components/cameraControl";
import Transform3DComponent from "@/conduct-ecs/components/transformComponent";
import {
  InputKeyMouseLeft,
  InputState,
} from "@/conduct-ecs/state/client/inputState";

export default function CameraControllerSystem(
  query: Query<[CameraControlComponent, CameraComponent, Transform3DComponent]>
) {
  const inputState = query.world.getState(InputState);

  query.iter(([_, cameraControl, camera, transform]) => {
    const isDragging = inputState.isPressed(InputKeyMouseLeft);
    const { clientX, clientY } = inputState.currentMousePosition;

    if (isDragging) {
      // Initialize last mouse position on first frame of drag
      if (cameraControl.lastMouseX === 0 && cameraControl.lastMouseY === 0) {
        cameraControl.lastMouseX = clientX;
        cameraControl.lastMouseY = clientY;
      }

      const deltaX = clientX - cameraControl.lastMouseX;
      const deltaY = clientY - cameraControl.lastMouseY;
      cameraControl.lastMouseX = clientX;
      cameraControl.lastMouseY = clientY;
      cameraControl.panDeltaX += deltaX;
      cameraControl.panDeltaY += deltaY;
    } else {
      // Reset on drag end
      cameraControl.lastMouseX = 0;
      cameraControl.lastMouseY = 0;
    }

    if (cameraControl.panDeltaX !== 0 || cameraControl.panDeltaY !== 0) {
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

      const panX = cameraControl.panDeltaX * cameraControl.panSpeed;
      const panY = cameraControl.panDeltaY * cameraControl.panSpeed;

      transform.x -= right[0] * panX;
      transform.y += panY;
      transform.z -= right[2] * panX;

      camera.lookAt[0] -= right[0] * panX;
      camera.lookAt[1] += panY;
      camera.lookAt[2] -= right[2] * panX;

      cameraControl.panDeltaX = 0;
      cameraControl.panDeltaY = 0;
    }

    const wheelEvent = inputState.getEvent("wheel") as WheelEvent;
    if (wheelEvent) {
      cameraControl.zoomDelta += wheelEvent.deltaY;
    }

    if (cameraControl.zoomDelta !== 0) {
      const forward = vec3.create();
      vec3.subtract(
        forward,
        camera.lookAt,
        vec3.fromValues(transform.x, transform.y, transform.z)
      );

      const distance = vec3.length(forward);
      vec3.normalize(forward, forward);

      const zoomAmount =
        cameraControl.zoomDelta * cameraControl.zoomSpeed * 0.01;
      const newDistance = Math.max(
        cameraControl.minZoom,
        Math.min(cameraControl.maxZoom, distance + zoomAmount * distance)
      );

      const scaleFactor = (distance - newDistance) / distance;
      transform.x += forward[0] * scaleFactor * distance;
      transform.y += forward[1] * scaleFactor * distance;
      transform.z += forward[2] * scaleFactor * distance;

      cameraControl.zoomDelta = 0;
    }
  });
}
