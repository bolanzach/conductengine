import { Component } from "@/conduct-ecs";

export class CameraControlComponent extends Component {
  lastMouseX = 0;
  lastMouseY = 0;
  panSpeed = 0.01;
  zoomSpeed = 0.5;
  minZoom = 5;
  maxZoom = 100;
  panDeltaX = 0;
  panDeltaY = 0;
  zoomDelta = 0;
}
