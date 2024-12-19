import { mat4, vec3 } from "gl-matrix";

import CameraComponent from "@/conduct-ecs/components/cameraComponent";
import Transform3DComponent from "@/conduct-ecs/components/transformComponent";

// export function getViewMatrix(
//   transform: Transform3DComponent,
//   camera: CameraComponent
// ): mat4 {
//   const viewMatrix = mat4.create();
//
//   mat4.lookAt(
//     viewMatrix,
//     vec3.fromValues(transform.x, transform.y, transform.z),
//     camera.lookAt,
//     vec3.fromValues(0, 1, 0)
//   );
//
//   mat4.rotateX(viewMatrix, viewMatrix, transform.rx);
//   mat4.rotateY(viewMatrix, viewMatrix, transform.ry);
//   mat4.rotateZ(viewMatrix, viewMatrix, transform.rz);
//   return viewMatrix;
// }
//
// export function getProjectionMatrix(camera: CameraComponent): mat4 {
//   const projectionMatrix = mat4.create();
//   mat4.perspective(
//     projectionMatrix,
//     camera.fovy,
//     camera.aspect,
//     camera.near,
//     camera.far
//   );
//   return projectionMatrix;
// }
//
// export function getCameraViewProjectionMatrix(
//   transform: Transform3DComponent,
//   camera: CameraComponent
// ): mat4 {
//   const viewProjMatrix = mat4.create();
//   const view = getViewMatrix(transform, camera);
//   const proj = getProjectionMatrix(camera);
//   mat4.multiply(viewProjMatrix, proj, view);
//   return viewProjMatrix;
// }
