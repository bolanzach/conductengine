import { Query, World } from "@/conduct-ecs";
import RenderComponent from "@/conduct-ecs/components/renderComponent";
import { WebGpuRendererState } from "@/conduct-ecs/systems/client/render/webGpuRendererInitSystem.client";

export default function WebGpuRendererSystem(query: Query<[]>) {
  const { context } = query.world.getState(WebGpuRendererState);
}

export function initRenderComponent(component: RenderComponent) {
  //idk.constructRenderComponent();

  // const { device } = world.getState(WebGpuRendererState);

  // component.renderPipeline = device.createRenderPipeline({
  //   layout: "auto",
  //   vertex: {
  //     module: device.createShaderModule({ code: vertxShader() }),
  //     entryPoint: "main",
  //     buffers: [
  //       {
  //         arrayStride: component.stride, // ( 3 (pos) + 3 (norm) + 2 (uv) ) * 4 bytes
  //         attributes: [
  //           {
  //             // position
  //             shaderLocation: 0,
  //             offset: 0,
  //             format: "float32x3",
  //           },
  //           {
  //             // norm
  //             shaderLocation: 1,
  //             offset: 3 * 4,
  //             format: "float32x3",
  //           },
  //           {
  //             // uv
  //             shaderLocation: 2,
  //             offset: (3 + 3) * 4,
  //             format: "float32x2",
  //           },
  //         ],
  //       } as GPUVertexBufferLayout,
  //     ],
  //   },
  //   fragment: {
  //     module: device.createShaderModule({
  //       code: fragmentShader(imageBitmap != null),
  //     }),
  //     entryPoint: "main",
  //     targets: [
  //       {
  //         format: "bgra8unorm" as GPUTextureFormat,
  //       },
  //     ],
  //   },
  //   primitive: {
  //     topology: "triangle-list",
  //     cullMode: "back",
  //   },
  //   // Enable depth testing so that the fragment closest to the camera
  //   // is rendered in front.
  //   depthStencil: {
  //     depthWriteEnabled: true,
  //     depthCompare: "less",
  //     format: "depth24plus-stencil8",
  //   },
  // } as unknown as GPURenderPipelineDescriptor);
  return {};
}
