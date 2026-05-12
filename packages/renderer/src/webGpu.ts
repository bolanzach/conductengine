import { BASIC_SHADER } from './shaders/basic.js';

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

export function mat4Scale(out: Float32Array, sx: number, sy: number, sz: number) {
  out.set(mat4Identity());
  out[0] = sx;
  out[5] = sy;
  out[10] = sz;
}

export function mat4Invert(out: Float32Array, m: Float32Array): boolean {
  const m0 = m[0]!, m1 = m[1]!, m2 = m[2]!, m3 = m[3]!;
  const m4 = m[4]!, m5 = m[5]!, m6 = m[6]!, m7 = m[7]!;
  const m8 = m[8]!, m9 = m[9]!, m10 = m[10]!, m11 = m[11]!;
  const m12 = m[12]!, m13 = m[13]!, m14 = m[14]!, m15 = m[15]!;

  const b0 = m0 * m5 - m1 * m4;
  const b1 = m0 * m6 - m2 * m4;
  const b2 = m0 * m7 - m3 * m4;
  const b3 = m1 * m6 - m2 * m5;
  const b4 = m1 * m7 - m3 * m5;
  const b5 = m2 * m7 - m3 * m6;
  const b6 = m8 * m13 - m9 * m12;
  const b7 = m8 * m14 - m10 * m12;
  const b8 = m8 * m15 - m11 * m12;
  const b9 = m9 * m14 - m10 * m13;
  const b10 = m9 * m15 - m11 * m13;
  const b11 = m10 * m15 - m11 * m14;

  const det = b0 * b11 - b1 * b10 + b2 * b9 + b3 * b8 - b4 * b7 + b5 * b6;
  if (Math.abs(det) < 1e-8) return false;

  const invDet = 1.0 / det;
  out[0] = (m5 * b11 - m6 * b10 + m7 * b9) * invDet;
  out[1] = (m2 * b10 - m1 * b11 - m3 * b9) * invDet;
  out[2] = (m13 * b5 - m14 * b4 + m15 * b3) * invDet;
  out[3] = (m10 * b4 - m9 * b5 - m11 * b3) * invDet;
  out[4] = (m6 * b8 - m4 * b11 - m7 * b7) * invDet;
  out[5] = (m0 * b11 - m2 * b8 + m3 * b7) * invDet;
  out[6] = (m14 * b2 - m12 * b5 - m15 * b1) * invDet;
  out[7] = (m8 * b5 - m10 * b2 + m11 * b1) * invDet;
  out[8] = (m4 * b10 - m5 * b8 + m7 * b6) * invDet;
  out[9] = (m1 * b8 - m0 * b10 - m3 * b6) * invDet;
  out[10] = (m12 * b4 - m13 * b2 + m15 * b0) * invDet;
  out[11] = (m9 * b2 - m8 * b4 - m11 * b0) * invDet;
  out[12] = (m5 * b7 - m4 * b9 - m6 * b6) * invDet;
  out[13] = (m0 * b9 - m1 * b7 + m2 * b6) * invDet;
  out[14] = (m13 * b1 - m12 * b3 - m14 * b0) * invDet;
  out[15] = (m8 * b3 - m9 * b1 + m10 * b0) * invDet;
  return true;
}



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