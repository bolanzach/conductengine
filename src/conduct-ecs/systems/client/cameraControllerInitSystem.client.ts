import { World } from "@/conduct-ecs";
import { createState } from "@/conduct-ecs/state";
import { CanvasState } from "@/conduct-ecs/state/client/canvasState";

export const CameraController = {
  isDragging: false,
  lastMouseX: 0,
  lastMouseY: 0,
  panSpeed: 0.01,
  zoomSpeed: 0.5,
  minZoom: 5,
  maxZoom: 100,
  panDeltaX: 0,
  panDeltaY: 0,
  zoomDelta: 0,
};

export const CameraControllerState = createState<typeof CameraController>();

export function CameraControllerInitSystem(world: World) {
  const { canvas } = world.getState(CanvasState);
  const cameraControllerState = world.getState(CameraControllerState);

  if (canvas) {
    canvas.addEventListener("mousedown", (e) => {
      cameraControllerState.isDragging = true;
      cameraControllerState.lastMouseX = e.clientX;
      cameraControllerState.lastMouseY = e.clientY;
    });

    canvas.addEventListener("mouseup", () => {
      cameraControllerState.isDragging = false;
    });

    canvas.addEventListener("mousemove", (e) => {
      if (!cameraControllerState.isDragging) return;

      const deltaX = e.clientX - cameraControllerState.lastMouseX;
      const deltaY = e.clientY - cameraControllerState.lastMouseY;

      cameraControllerState.lastMouseX = e.clientX;
      cameraControllerState.lastMouseY = e.clientY;

      cameraControllerState.panDeltaX += deltaX;
      cameraControllerState.panDeltaY += deltaY;
    });

    canvas.addEventListener("wheel", (e) => {
      e.preventDefault();
      cameraControllerState.zoomDelta += e.deltaY;
    });
  }
}
