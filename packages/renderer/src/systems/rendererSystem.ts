import { Query } from "@conduct/ecs";
import { Transform3D } from "@conduct/simulation";
import { MeshRenderer } from "../components/meshRenderer.js";
import { Material } from "../components/material.js";
import {
  gpu, beginFrame, endFrame,
  mat4Translation, mat4RotateX, mat4RotateY, mat4RotateZ, mat4Scale, mat4Multiply,
} from "../webGpu.js";
import { viewMatrix, projMatrix } from "./cameraSystem.js";

const modelMatrix = new Float32Array(16);
const scratchA = new Float32Array(16);
const scratchB = new Float32Array(16);
const colorBuffer = new Float32Array(4);
let entityDrawIndex = 0;

export default function RendererSystem(query: Query<[Transform3D, MeshRenderer, Material]>) {
  entityDrawIndex = 0;
  beginFrame();

  query.iter(([_, transform, mesh, material]) => {
    mat4Translation(modelMatrix, transform.x, transform.y, transform.z);
    mat4RotateY(scratchA, transform.ry);
    mat4Multiply(scratchB, modelMatrix, scratchA);
    mat4RotateX(scratchA, transform.rx);
    mat4Multiply(modelMatrix, scratchB, scratchA);
    mat4RotateZ(scratchA, transform.rz);
    mat4Multiply(scratchB, modelMatrix, scratchA);
    mat4Scale(scratchA, transform.sx, transform.sy, transform.sz);
    mat4Multiply(modelMatrix, scratchB, scratchA);

    const offset = entityDrawIndex * gpu.uniformStride;
    gpu.device.queue.writeBuffer(gpu.uniformBuffer, offset, modelMatrix);
    gpu.device.queue.writeBuffer(gpu.uniformBuffer, offset + 64, viewMatrix);
    gpu.device.queue.writeBuffer(gpu.uniformBuffer, offset + 128, projMatrix);

    colorBuffer[0] = material.r;
    colorBuffer[1] = material.g;
    colorBuffer[2] = material.b;
    colorBuffer[3] = material.a;
    gpu.device.queue.writeBuffer(gpu.uniformBuffer, offset + 192, colorBuffer);

    gpu.passEncoder.setBindGroup(0, gpu.uniformBindGroup, [offset]);

    const meshData = gpu.meshRegistry[mesh.meshId]!;
    gpu.passEncoder.setVertexBuffer(0, meshData.vertexBuffer);
    gpu.passEncoder.setIndexBuffer(meshData.indexBuffer, 'uint16');
    gpu.passEncoder.drawIndexed(meshData.indexCount);

    entityDrawIndex++;
  });

  endFrame();
}