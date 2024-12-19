import { vec3 } from "gl-matrix";

import { Component } from "@/conduct-ecs";

export default class CameraComponent extends Component {
  fovy = (2 * Math.PI) / 5;
  aspect = 16 / 9;
  near = 0.1;
  far = 1000;
  lookAt = vec3.fromValues(0, 0, 0);
}
