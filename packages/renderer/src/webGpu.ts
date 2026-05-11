import { BASIC_SHADER } from './shaders/basic.js';
import type { GeometryData } from './geometry/types.js';

export interface MeshGpuData {
  vertexBuffer: GPUBuffer;
  indexBuffer: GPUBuffer;
  indexCount: number;
}

export const gpu = {
  device: null! as GPUDevice,
  uniformBuffer: null! as GPUBuffer,
  uniformBindGroup: null! as GPUBindGroup,
  uniformStride: 0,
  passEncoder: null! as GPURenderPassEncoder,
  meshRegistry: [] as (MeshGpuData | null)[],
};

let context: GPUCanvasContext;
let pipeline: GPURenderPipeline;
let depthTexture: GPUTexture;
let commandEncoder: GPUCommandEncoder;

export function mat4Identity(): Float32Array {
  const out = new Float32Array(16);
  out[0] = 1; out[5] = 1; out[10] = 1; out[15] = 1;
  return out;
}

export function mat4Perspective(out: Float32Array, fovDeg: number, aspect: number, near: number, far: number) {
  out.fill(0);
  const f = 1.0 / Math.tan((fovDeg * Math.PI / 180) / 2);
  const nf = 1 / (near - far);
  out[0] = f / aspect;
  out[5] = f;
  out[10] = (far + near) * nf;
  out[11] = -1;
  out[14] = 2 * far * near * nf;
}

export function mat4Multiply(out: Float32Array, a: Float32Array, b: Float32Array) {
  for (let i = 0; i < 4; i++) {
    for (let j = 0; j < 4; j++) {
      out[j * 4 + i] =
        a[i]! * b[j * 4]! +
        a[4 + i]! * b[j * 4 + 1]! +
        a[8 + i]! * b[j * 4 + 2]! +
        a[12 + i]! * b[j * 4 + 3]!;
    }
  }
}

export function mat4Translation(out: Float32Array, x: number, y: number, z: number) {
  out.set(mat4Identity());
  out[12] = x; out[13] = y; out[14] = z;
}

export function mat4RotateX(out: Float32Array, angle: number) {
  out.set(mat4Identity());
  const c = Math.cos(angle), s = Math.sin(angle);
  out[5] = c; out[6] = s;
  out[9] = -s; out[10] = c;
}

export function mat4RotateY(out: Float32Array, angle: number) {
  out.set(mat4Identity());
  const c = Math.cos(angle), s = Math.sin(angle);
  out[0] = c; out[2] = -s;
  out[8] = s; out[10] = c;
}

export function mat4RotateZ(out: Float32Array, angle: number) {
  out.set(mat4Identity());
  const c = Math.cos(angle), s = Math.sin(angle);
  out[0] = c; out[1] = s;
  out[4] = -s; out[5] = c;
}

export const _tmp1 = new Float32Array(16);
export const _tmp2 = new Float32Array(16);
export const _tmp3 = new Float32Array(16);
export const _model = new Float32Array(16);

export async function initRenderer(canvas: HTMLCanvasElement) {
  const adapter = await navigator.gpu.requestAdapter();
  if (!adapter) throw new Error('WebGPU adapter not available');

  gpu.device = await adapter.requestDevice();
  context = canvas.getContext('webgpu')!;
  const presentationFormat = navigator.gpu.getPreferredCanvasFormat();

  context.configure({
    device: gpu.device,
    format: presentationFormat,
    alphaMode: 'premultiplied',
  });

  depthTexture = gpu.device.createTexture({
    size: [canvas.width, canvas.height],
    format: 'depth24plus',
    usage: GPUTextureUsage.RENDER_ATTACHMENT,
  });

  const align = gpu.device.limits.minUniformBufferOffsetAlignment;
  gpu.uniformStride = Math.ceil(208 / align) * align;

  gpu.uniformBuffer = gpu.device.createBuffer({
    size: gpu.uniformStride * 1024,
    usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
  });

  const shaderModule = gpu.device.createShaderModule({ code: BASIC_SHADER });

  const bindGroupLayout = gpu.device.createBindGroupLayout({
    entries: [{
      binding: 0,
      visibility: GPUShaderStage.VERTEX | GPUShaderStage.FRAGMENT,
      buffer: { type: 'uniform', hasDynamicOffset: true },
    }],
  });

  gpu.uniformBindGroup = gpu.device.createBindGroup({
    layout: bindGroupLayout,
    entries: [{ binding: 0, resource: { buffer: gpu.uniformBuffer, size: gpu.uniformStride } }],
  });

  pipeline = gpu.device.createRenderPipeline({
    layout: gpu.device.createPipelineLayout({ bindGroupLayouts: [bindGroupLayout] }),
    vertex: {
      module: shaderModule,
      entryPoint: 'vs',
      buffers: [{
        arrayStride: 12,
        attributes: [{ shaderLocation: 0, offset: 0, format: 'float32x3' as GPUVertexFormat }],
      }],
    },
    fragment: {
      module: shaderModule,
      entryPoint: 'fs',
      targets: [{ format: presentationFormat }],
    },
    primitive: {
      topology: 'triangle-list',
      cullMode: 'back',
    },
    depthStencil: {
      format: 'depth24plus',
      depthWriteEnabled: true,
      depthCompare: 'less',
    },
  });
}

const freeMeshIds: number[] = [];

export function registerMesh(geometry: GeometryData): number {
  const vertexBuffer = gpu.device.createBuffer({
    size: geometry.positions.byteLength,
    usage: GPUBufferUsage.VERTEX | GPUBufferUsage.COPY_DST,
  });
  gpu.device.queue.writeBuffer(vertexBuffer, 0, geometry.positions as unknown as ArrayBuffer);

  const indexBuffer = gpu.device.createBuffer({
    size: geometry.indices.byteLength,
    usage: GPUBufferUsage.INDEX | GPUBufferUsage.COPY_DST,
  });
  gpu.device.queue.writeBuffer(indexBuffer, 0, geometry.indices as unknown as ArrayBuffer);

  const entry: MeshGpuData = { vertexBuffer, indexBuffer, indexCount: geometry.indices.length };

  if (freeMeshIds.length > 0) {
    const id = freeMeshIds.pop()!;
    gpu.meshRegistry[id] = entry;
    return id;
  }

  const id = gpu.meshRegistry.length;
  gpu.meshRegistry.push(entry);
  return id;
}

export function unregisterMesh(id: number): void {
  const entry = gpu.meshRegistry[id];
  if (!entry) return;
  entry.vertexBuffer.destroy();
  entry.indexBuffer.destroy();
  gpu.meshRegistry[id] = null;
  freeMeshIds.push(id);
}

export function beginFrame() {
  commandEncoder = gpu.device.createCommandEncoder();
  gpu.passEncoder = commandEncoder.beginRenderPass({
    colorAttachments: [{
      view: context.getCurrentTexture().createView(),
      clearValue: { r: 0.1, g: 0.1, b: 0.15, a: 1.0 },
      loadOp: 'clear',
      storeOp: 'store',
    }],
    depthStencilAttachment: {
      view: depthTexture.createView(),
      depthClearValue: 1.0,
      depthLoadOp: 'clear',
      depthStoreOp: 'store',
    },
  });

  gpu.passEncoder.setPipeline(pipeline);
}

export function endFrame() {
  gpu.passEncoder.end();
  gpu.device.queue.submit([commandEncoder.finish()]);
}