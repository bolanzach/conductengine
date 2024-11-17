import { World } from "@/conduct-ecs";
import RenderComponent from "@/conduct-ecs/components/renderComponent";
import { EVENT_COMPONENT_ADDED } from "@/conduct-ecs/event";
import { createState } from "@/conduct-ecs/state";
import { EventState } from "@/conduct-ecs/systems/eventSystem";

export const WebGpuRendererState = createState<{
  context: GPUCanvasContext;
  device: GPUDevice;
  renderPassDescriptor: GPURenderPassDescriptor;
  cameraUniformBuffer: GPUBuffer;
  lightDataBuffer: GPUBuffer;
  lightDataSize: number;
}>();

export default async function WebGpuRendererInitSystem(world: World) {
  const canvas = document.getElementById("canvas") as HTMLCanvasElement;
  if (!canvas) {
    console.error("missing canvas!");
    return;
  }

  const adapter = await navigator.gpu.requestAdapter();
  if (!adapter) {
    console.error("found no gpu adapter!");
    return;
  }

  const device = await adapter.requestDevice();

  if (!device) {
    console.error("found no gpu device!");
    return;
  }

  // @ts-expect-error webpgu_ts_compilation
  const context = canvas.getContext("webgpu") as GPUCanvasContext;
  if (!context) {
    console.error("could not get webgpu context!");
    return;
  }

  const presentationFormat = navigator.gpu.getPreferredCanvasFormat();
  const presentationSize = [
    canvas.clientWidth * devicePixelRatio,
    canvas.clientHeight * devicePixelRatio,
  ];

  context.configure({
    device,
    format: presentationFormat,
    alphaMode: "premultiplied",
  });

  const renderPassDescriptor = {
    colorAttachments: [
      {
        // attachment is acquired and set in render loop.
        view: depthTextureView(device, canvas),
        loadOp: "clear",
        clearValue: { r: 0.25, g: 0.25, b: 0.25, a: 1.0 },
        storeOp: "store",
      } as unknown as GPURenderPassColorAttachment,
    ],
    depthStencilAttachment: {
      view: depthTextureView(device, canvas),
      depthLoadOp: "clear",
      depthClearValue: 1.0,
      depthStoreOp: "store",
      stencilLoadOp: "clear",
      stencilClearValue: 0,
      stencilStoreOp: "store",
    } as GPURenderPassDepthStencilAttachment,
  };

  const cameraUniformBuffer = device.createBuffer({
    size: 4 * 16,
    usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
  });
  const lightDataSize = 3 * 4 + 4; // vec3 size in bytes
  const lightDataBuffer = device.createBuffer({
    size: lightDataSize,
    usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
  });

  world.registerState(WebGpuRendererState, {
    context,
    device,
    renderPassDescriptor,
    cameraUniformBuffer,
    lightDataBuffer,
    lightDataSize: 3 * 4 + 4, // vec3 size in bytes
  });
}

function depthTextureView(device: GPUDevice, canvas: HTMLCanvasElement) {
  return device
    .createTexture({
      size: [
        canvas.clientWidth, //* devicePixelRatio,
        canvas.clientHeight, //  * devicePixelRatio,
      ],
      format: "depth24plus-stencil8",
      usage: GPUTextureUsage.RENDER_ATTACHMENT,
    })
    .createView();
}
