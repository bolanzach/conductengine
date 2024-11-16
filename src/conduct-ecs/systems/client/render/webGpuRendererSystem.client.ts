import { Query } from "@/conduct-ecs";
import RenderComponent from "@/conduct-ecs/components/renderComponent";
import { WebGpuRendererState } from "@/conduct-ecs/systems/client/render/webGpuRendererInitSystem.client";

export default function WebGpuRendererSystem(query: Query<[RenderComponent]>) {
  const { device, renderPassDescriptor } =
    query.world.getState(WebGpuRendererState);

  const commandEncoder = device.createCommandEncoder();
  const passEncoder = commandEncoder.beginRenderPass(renderPassDescriptor);

  for (const [_, renderComponent] of query) {
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
}
