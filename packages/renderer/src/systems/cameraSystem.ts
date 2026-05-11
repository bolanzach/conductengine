import { Query } from "@conduct/ecs";
import { Transform3D } from "@conduct/simulation";
import { Camera } from "../components/camera.js";
import {
  mat4Perspective, mat4Multiply, mat4Translation,
  mat4RotateX, mat4RotateY, mat4RotateZ,
  _tmp1, _tmp2, _tmp3,
} from "../webGpu.js";

export const viewMatrix = new Float32Array(16);
export const projMatrix = new Float32Array(16);

export default function CameraSystem(query: Query<[Transform3D, Camera]>) {
  query.iter(([_, transform, camera]) => {
    if (camera.active) {
      mat4Perspective(projMatrix, camera.fov, camera.aspect, camera.near, camera.far);

      mat4RotateZ(_tmp1, -transform.rz);
      mat4RotateX(_tmp2, -transform.rx);
      mat4Multiply(_tmp3, _tmp1, _tmp2);
      mat4RotateY(_tmp1, -transform.ry);
      mat4Multiply(_tmp2, _tmp3, _tmp1);
      mat4Translation(_tmp1, -transform.x, -transform.y, -transform.z);
      mat4Multiply(viewMatrix, _tmp2, _tmp1);
    }
  });
}