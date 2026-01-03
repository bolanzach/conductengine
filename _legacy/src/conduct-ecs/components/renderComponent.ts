import { mat4 } from "gl-matrix";

import { Component } from "@/conduct-ecs";

export interface Color {
  r: number;
  g: number;
  b: number;
}

interface Vertex {
  pos: [number, number, number];
  norm: [number, number, number];
  uv: [number, number];
}

function getVertices(): Vertex[] {
  return [
    // front
    { pos: [-1, -1, 1], norm: [0, 0, 1], uv: [0, 0] },
    { pos: [1, -1, 1], norm: [0, 0, 1], uv: [1, 0] },
    { pos: [-1, 1, 1], norm: [0, 0, 1], uv: [0, 1] },

    { pos: [-1, 1, 1], norm: [0, 0, 1], uv: [0, 1] },
    { pos: [1, -1, 1], norm: [0, 0, 1], uv: [1, 0] },
    { pos: [1, 1, 1], norm: [0, 0, 1], uv: [1, 1] },
    // right
    { pos: [1, -1, 1], norm: [1, 0, 0], uv: [0, 0] },
    { pos: [1, -1, -1], norm: [1, 0, 0], uv: [1, 0] },
    { pos: [1, 1, 1], norm: [1, 0, 0], uv: [0, 1] },

    { pos: [1, 1, 1], norm: [1, 0, 0], uv: [0, 1] },
    { pos: [1, -1, -1], norm: [1, 0, 0], uv: [1, 0] },
    { pos: [1, 1, -1], norm: [1, 0, 0], uv: [1, 1] },
    // back
    { pos: [1, -1, -1], norm: [0, 0, -1], uv: [0, 0] },
    { pos: [-1, -1, -1], norm: [0, 0, -1], uv: [1, 0] },
    { pos: [1, 1, -1], norm: [0, 0, -1], uv: [0, 1] },

    { pos: [1, 1, -1], norm: [0, 0, -1], uv: [0, 1] },
    { pos: [-1, -1, -1], norm: [0, 0, -1], uv: [1, 0] },
    { pos: [-1, 1, -1], norm: [0, 0, -1], uv: [1, 1] },
    // left
    { pos: [-1, -1, -1], norm: [-1, 0, 0], uv: [0, 0] },
    { pos: [-1, -1, 1], norm: [-1, 0, 0], uv: [1, 0] },
    { pos: [-1, 1, -1], norm: [-1, 0, 0], uv: [0, 1] },

    { pos: [-1, 1, -1], norm: [-1, 0, 0], uv: [0, 1] },
    { pos: [-1, -1, 1], norm: [-1, 0, 0], uv: [1, 0] },
    { pos: [-1, 1, 1], norm: [-1, 0, 0], uv: [1, 1] },
    // top
    { pos: [1, 1, -1], norm: [0, 1, 0], uv: [0, 0] },
    { pos: [-1, 1, -1], norm: [0, 1, 0], uv: [1, 0] },
    { pos: [1, 1, 1], norm: [0, 1, 0], uv: [0, 1] },

    { pos: [1, 1, 1], norm: [0, 1, 0], uv: [0, 1] },
    { pos: [-1, 1, -1], norm: [0, 1, 0], uv: [1, 0] },
    { pos: [-1, 1, 1], norm: [0, 1, 0], uv: [1, 1] },
    // bottom
    { pos: [1, -1, 1], norm: [0, -1, 0], uv: [0, 0] },
    { pos: [-1, -1, 1], norm: [0, -1, 0], uv: [1, 0] },
    { pos: [1, -1, -1], norm: [0, -1, 0], uv: [0, 1] },

    { pos: [1, -1, -1], norm: [0, -1, 0], uv: [0, 1] },
    { pos: [-1, -1, 1], norm: [0, -1, 0], uv: [1, 0] },
    { pos: [-1, -1, -1], norm: [0, -1, 0], uv: [1, 1] },
  ];
}

export default class RenderComponent extends Component {
  matrixSize = 4 * 16; // 4x4 matrix
  offset = 256; // transformationBindGroup offset must be 256-byte aligned
  uniformBufferSize = this.offset;

  vertices: Vertex[] = getVertices();

  color: Color = {
    r: 0.9,
    g: 0.6,
    b: 0.1,
  };

  transformMatrix = mat4.create() as Float32Array;
  rotateMatrix = mat4.create() as Float32Array;

  renderPipeline: GPURenderPipeline = undefined as unknown as GPURenderPipeline;
  transformationBuffer: GPUBuffer = undefined as unknown as GPUBuffer;
  transformationBindGroup: GPUBindGroup | null = null;
  verticesBuffer: GPUBuffer | null = null;
  colorBuffer?: GPUBuffer = undefined;

  perVertex = 3 + 3 + 2; // 3 for position, 3 for normal, 2 for uv, 3 for color
  stride = this.perVertex * 4; // stride = byte length of vertex data array
}
