import { vec3 } from "gl-matrix";

import { Query } from "@/conduct-ecs";
import { getCameraViewProjectionMatrix } from "@/conduct-ecs/components/cameraComponent";
import RenderComponent from "@/conduct-ecs/components/renderComponent";
import { CameraState } from "@/conduct-ecs/systems/cameraSystem";
import { WebGpuRendererState } from "@/conduct-ecs/systems/client/render/webGpuRendererInitSystem.client";

export default function WebGpuRendererSystem(query: Query<[RenderComponent]>) {
  const {
    context,
    device,
    renderPassDescriptor,
    cameraUniformBuffer,
    lightDataBuffer,
  } = query.world.getState(WebGpuRendererState);
  const { mainCamera } = query.world.getState(CameraState);

  // CAMERA BUFFER
  const cameraViewProjectionMatrix = getCameraViewProjectionMatrix(
    mainCamera.transform,
    mainCamera.camera
  ) as Float32Array;
  device.queue.writeBuffer(
    cameraUniformBuffer,
    0,
    cameraViewProjectionMatrix.buffer,
    cameraViewProjectionMatrix.byteOffset,
    cameraViewProjectionMatrix.byteLength
  );

  // LIGHT BUFFER
  const lightPosition = vec3.fromValues(0, 0, 0) as Float32Array; // scene.getPointLightPosition();
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

  for (const [_, renderComponent] of query) {
    // THIS NEEDS TO BE UNIQUE TO EACH RENDERER ???
    passEncoder.setPipeline(renderComponent.renderPipeline);
    device.queue.writeBuffer(
      renderComponent.transformationBuffer,
      0,
      renderComponent.transformMatrix.buffer,
      renderComponent.transformMatrix.byteOffset,
      renderComponent.transformMatrix.byteLength
    );
    device.queue.writeBuffer(
      renderComponent.transformationBuffer,
      64,
      renderComponent.rotateMatrix.buffer,
      renderComponent.rotateMatrix.byteOffset,
      renderComponent.rotateMatrix.byteLength
    );
    passEncoder.setVertexBuffer(0, renderComponent.verticesBuffer);
    passEncoder.setBindGroup(0, renderComponent.transformationBindGroup);
    passEncoder.draw(renderComponent.vertices.length, 1, 0, 0);
  }

  passEncoder.end();
  device.queue.submit([commandEncoder.finish()]);
}
