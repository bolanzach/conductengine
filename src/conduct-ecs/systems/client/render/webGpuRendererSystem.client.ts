import { mat4, vec3 } from "gl-matrix";

import { Query } from "@/conduct-ecs";
import CameraComponent from "@/conduct-ecs/components/cameraComponent";
import RenderComponent from "@/conduct-ecs/components/renderComponent";
import Transform3DComponent from "@/conduct-ecs/components/transformComponent";
import { getCameraViewProjectionMatrix } from "@/conduct-ecs/systems/cameraSystem";
import { WebGpuRendererState } from "@/conduct-ecs/systems/client/render/webGpuRendererInitSystem.client";

function updateTransformationMatrix(
  renderComponent: RenderComponent,
  transformComponent: Transform3DComponent
) {
  // MOVE / TRANSLATE OBJECT
  const transform = mat4.create();
  const rotate = mat4.create();

  mat4.translate(
    transform,
    transform,
    vec3.fromValues(
      transformComponent.x,
      transformComponent.y,
      transformComponent.z
    )
  );
  mat4.rotateX(transform, transform, transformComponent.rx);
  mat4.rotateY(transform, transform, transformComponent.ry);
  mat4.rotateZ(transform, transform, transformComponent.rz);

  mat4.rotateX(rotate, rotate, transformComponent.rx);
  mat4.rotateY(rotate, rotate, transformComponent.ry);
  mat4.rotateZ(rotate, rotate, transformComponent.rz);

  // APPLY
  mat4.copy(renderComponent.transformMatrix, transform);
  mat4.copy(renderComponent.rotateMatrix, rotate);
}

export default function WebGpuRendererSystem(
  renderQuery: Query<[RenderComponent, Transform3DComponent]>,
  cameraQuery: Query<[CameraComponent, Transform3DComponent]>
) {
  const {
    device,
    context,
    cameraUniformBuffer,
    lightDataBuffer,
    renderPassDescriptor,
  } = renderQuery.world.getState(WebGpuRendererState);
  let camera: CameraComponent;
  let cameraTransform: Transform3DComponent;
  cameraQuery.iter(([, cam, camTransform]) => {
    camera = cam;
    cameraTransform = camTransform;
  });
  // CAMERA BUFFER
  const cameraViewProjectionMatrix = getCameraViewProjectionMatrix(
    cameraTransform,
    camera
  ) as Float32Array;
  device.queue.writeBuffer(
    cameraUniformBuffer,
    0,
    cameraViewProjectionMatrix.buffer,
    cameraViewProjectionMatrix.byteOffset,
    cameraViewProjectionMatrix.byteLength
  );

  // LIGHT BUFFER
  const lightPosition = vec3.fromValues(0, 0, 0) as Float32Array;
  device.queue.writeBuffer(
    lightDataBuffer,
    0,
    lightPosition.buffer,
    lightPosition.byteOffset,
    lightPosition.byteLength
  );

  (
    renderPassDescriptor.colorAttachments as [GPURenderPassColorAttachment]
  )[0].view = context.getCurrentTexture().createView();

  const commandEncoder = device.createCommandEncoder();
  const passEncoder = commandEncoder.beginRenderPass(renderPassDescriptor);

  renderQuery.iter(([_, renderComponent, transformComponent]) => {
    updateTransformationMatrix(renderComponent, transformComponent);

    const { transformMatrix, rotateMatrix } = renderComponent;
    passEncoder.setPipeline(renderComponent.renderPipeline);
    device.queue.writeBuffer(
      renderComponent.transformationBuffer,
      0,
      transformMatrix.buffer,
      transformMatrix.byteOffset,
      transformMatrix.byteLength
    );
    device.queue.writeBuffer(
      renderComponent.transformationBuffer,
      64,
      rotateMatrix.buffer,
      rotateMatrix.byteOffset,
      rotateMatrix.byteLength
    );
    passEncoder.setVertexBuffer(0, renderComponent.verticesBuffer);
    passEncoder.setBindGroup(0, renderComponent.transformationBindGroup);
    passEncoder.draw(renderComponent.vertices.length, 1, 0, 0);
  });

  passEncoder.end();
  device.queue.submit([commandEncoder.finish()]);
}
