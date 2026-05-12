import type { GeometryData } from "./geometry/types";
import { gpu, MeshGpuData } from "./webGpu";
import { createSphereGeometry } from "./geometry/sphere";
import { createCubeGeometry } from "./geometry/cube";

const freeMeshIds: number[] = [];

/**
 * Predefined geometry meshes
 */
export class MESH {
  static #cube = -1;
  static #sphere = -1;

  static get CUBE() {
    return MESH.#cube !== -1 ? MESH.#cube : (MESH.#cube = registerMesh(createCubeGeometry()));
  }
  static get SPHERE() {
    return MESH.#sphere !== -1 ? MESH.#sphere : (MESH.#sphere = registerMesh(createSphereGeometry()));
  }
}

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
