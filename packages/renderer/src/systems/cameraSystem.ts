import { Query } from "@conduct/ecs";
import { Transform3D } from "@conduct/simulation";
import { Camera } from "../components/camera.js";
import {
  mat4Perspective, mat4Multiply, mat4Translation,
  mat4RotateX, mat4RotateY, mat4RotateZ,
} from "../webGpu.js";

export const viewMatrix = new Float32Array(16);
export const projMatrix = new Float32Array(16);
const scratchA = new Float32Array(16);
const scratchB = new Float32Array(16);
const scratchC = new Float32Array(16);

export default function CameraSystem(query: Query<[Transform3D, Camera]>) {
  query.iter(([_, transform, camera]) => {
    if (camera.active) {
      mat4Perspective(projMatrix, camera.fov, camera.aspect, camera.near, camera.far);

      mat4RotateZ(scratchA, -transform.rz);
      mat4RotateX(scratchB, -transform.rx);
      mat4Multiply(scratchC, scratchA, scratchB);
      mat4RotateY(scratchA, -transform.ry);
      mat4Multiply(scratchB, scratchC, scratchA);
      mat4Translation(scratchA, -transform.x, -transform.y, -transform.z);
      mat4Multiply(viewMatrix, scratchB, scratchA);
    }
  });
}