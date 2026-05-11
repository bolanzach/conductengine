import { Query } from "@conduct/ecs";
import { Transform3D } from "@conduct/simulation";
import { MeshRenderer } from "../components/meshRenderer.js";
import { Material } from "../components/material.js";
import {
  gpu, beginFrame, endFrame,
  mat4Translation, mat4RotateX, mat4RotateY, mat4RotateZ, mat4Multiply,
  _model, _tmp1, _tmp2,
} from "../webGpu.js";

const colorBuffer = new Float32Array(4);

export default function RendererSystem(query: Query<[Transform3D, MeshRenderer, Material]>) {
  beginFrame();

  query.iter(([_, transform, mesh, material]) => {
    mat4Translation(_model, transform.x, transform.y, transform.z);
    mat4RotateY(_tmp1, transform.ry);
    mat4Multiply(_tmp2, _model, _tmp1);
    mat4RotateX(_tmp1, transform.rx);
    mat4Multiply(_model, _tmp2, _tmp1);
    mat4RotateZ(_tmp1, transform.rz);
    mat4Multiply(_tmp2, _model, _tmp1);

    gpu.device.queue.writeBuffer(gpu.uniformBuffer, 0, _tmp2);

    colorBuffer[0] = material.r;
    colorBuffer[1] = material.g;
    colorBuffer[2] = material.b;
    colorBuffer[3] = material.a;
    gpu.device.queue.writeBuffer(gpu.uniformBuffer, 192, colorBuffer);

    const meshData = gpu.meshRegistry[mesh.meshId]!;
    gpu.passEncoder.setVertexBuffer(0, meshData.vertexBuffer);
    gpu.passEncoder.setIndexBuffer(meshData.indexBuffer, 'uint16');
    gpu.passEncoder.drawIndexed(meshData.indexCount);
  });

  endFrame();
}