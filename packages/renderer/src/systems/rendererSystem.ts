import type { Query } from "@conduct/ecs";
import { Transform3D } from "@conduct/simulation";
import { MeshRenderer } from "../components/meshRenderer.js";
import { Material } from "../components/material.js";
import {
  gpu, beginFrame, endFrame,
  mat4Translation, mat4RotateX, mat4RotateY, mat4RotateZ, mat4Scale, mat4Multiply,
} from "../webGpu.js";
import { viewMatrix, projMatrix } from "./cameraSystem.js";
import { INSTANCED_SHADER } from "../shaders/instanced.js";

const modelMatrix = new Float32Array(16);
const scratchA = new Float32Array(16);
const scratchB = new Float32Array(16);

/** Per-instance data: mat4 model (64 bytes) + vec4 color (16 bytes) = 80 bytes */
const INSTANCE_STRIDE = 80;
const INSTANCE_FLOATS = INSTANCE_STRIDE / 4;

let instancedPipeline: GPURenderPipeline | null = null;
let cameraBuffer: GPUBuffer | null = null;
let instanceBuffer: GPUBuffer | null = null;
let instanceCpuBuffer = new Float32Array(1024 * INSTANCE_FLOATS);
let instanceBindGroupLayout: GPUBindGroupLayout | null = null;
let instanceBindGroup: GPUBindGroup | null = null;
let maxInstances = 1024;

interface MeshBatch {
  meshId: number;
  count: number;
}

function initInstancedPipeline() {
  const shaderModule = gpu.device.createShaderModule({ code: INSTANCED_SHADER });

  instanceBindGroupLayout = gpu.device.createBindGroupLayout({
    entries: [
      { binding: 0, visibility: GPUShaderStage.VERTEX, buffer: { type: 'uniform' } },
      { binding: 1, visibility: GPUShaderStage.VERTEX, buffer: { type: 'read-only-storage' } },
    ],
  });

  cameraBuffer = gpu.device.createBuffer({
    size: 128,
    usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
  });

  instanceBuffer = gpu.device.createBuffer({
    size: maxInstances * INSTANCE_STRIDE,
    usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST,
  });

  instanceBindGroup = gpu.device.createBindGroup({
    layout: instanceBindGroupLayout,
    entries: [
      { binding: 0, resource: { buffer: cameraBuffer } },
      { binding: 1, resource: { buffer: instanceBuffer } },
    ],
  });

  instancedPipeline = gpu.device.createRenderPipeline({
    layout: gpu.device.createPipelineLayout({ bindGroupLayouts: [instanceBindGroupLayout] }),
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
      targets: [{ format: navigator.gpu.getPreferredCanvasFormat() }],
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

function growInstanceBuffer(needed: number) {
  maxInstances = Math.max(needed, maxInstances * 2);
  instanceCpuBuffer = new Float32Array(maxInstances * INSTANCE_FLOATS);

  if (instanceBuffer) instanceBuffer.destroy();
  instanceBuffer = gpu.device.createBuffer({
    size: maxInstances * INSTANCE_STRIDE,
    usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST,
  });

  instanceBindGroup = gpu.device.createBindGroup({
    layout: instanceBindGroupLayout!,
    entries: [
      { binding: 0, resource: { buffer: cameraBuffer! } },
      { binding: 1, resource: { buffer: instanceBuffer } },
    ],
  });
}

const batches: MeshBatch[] = [];
const batchMap = new Map<number, number>();
let totalInstances = 0;

export default function RendererSystem(query: Query<[Transform3D, MeshRenderer, Material]>) {
  if (!instancedPipeline) initInstancedPipeline();

  batches.length = 0;
  batchMap.clear();
  totalInstances = 0;

  query.iter(([_, transform, mesh, material]) => {
    let batchIdx = batchMap.get(mesh.meshId);
    if (batchIdx === undefined) {
      batchIdx = batches.length;
      batches.push({ meshId: mesh.meshId, count: 0 });
      batchMap.set(mesh.meshId, batchIdx);
    }
    batches[batchIdx]!.count++;

    if (totalInstances >= maxInstances) {
      growInstanceBuffer(totalInstances + 1);
    }

    const offset = totalInstances * INSTANCE_FLOATS;

    mat4Translation(modelMatrix, transform.x, transform.y, transform.z);
    mat4RotateY(scratchA, transform.ry);
    mat4Multiply(scratchB, modelMatrix, scratchA);
    mat4RotateX(scratchA, transform.rx);
    mat4Multiply(modelMatrix, scratchB, scratchA);
    mat4RotateZ(scratchA, transform.rz);
    mat4Multiply(scratchB, modelMatrix, scratchA);
    mat4Scale(scratchA, transform.sx, transform.sy, transform.sz);
    mat4Multiply(modelMatrix, scratchB, scratchA);

    instanceCpuBuffer.set(modelMatrix, offset);
    instanceCpuBuffer[offset + 16] = material.r;
    instanceCpuBuffer[offset + 17] = material.g;
    instanceCpuBuffer[offset + 18] = material.b;
    instanceCpuBuffer[offset + 19] = material.a;

    totalInstances++;
  });

  if (totalInstances === 0) return;

  beginFrame();

  gpu.device.queue.writeBuffer(instanceBuffer!, 0, instanceCpuBuffer.buffer, 0, totalInstances * INSTANCE_STRIDE);
  gpu.device.queue.writeBuffer(cameraBuffer!, 0, viewMatrix);
  gpu.device.queue.writeBuffer(cameraBuffer!, 64, projMatrix);

  gpu.passEncoder.setPipeline(instancedPipeline!);
  gpu.passEncoder.setBindGroup(0, instanceBindGroup!);

  let instanceOffset = 0;
  for (let i = 0; i < batches.length; i++) {
    const batch = batches[i]!;
    const meshData = gpu.meshRegistry[batch.meshId]!;
    gpu.passEncoder.setVertexBuffer(0, meshData.vertexBuffer);
    gpu.passEncoder.setIndexBuffer(meshData.indexBuffer, 'uint16');
    gpu.passEncoder.drawIndexed(meshData.indexCount, batch.count, 0, 0, instanceOffset);
    instanceOffset += batch.count;
  }

  endFrame();
}