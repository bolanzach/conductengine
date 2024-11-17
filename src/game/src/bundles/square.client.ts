import { World } from "@/conduct-ecs";
import RenderComponent from "@/conduct-ecs/components/renderComponent";
import { WebGpuRendererState } from "@/conduct-ecs/systems/client/render/webGpuRendererInitSystem.client";
import fragmentShader from "@/game/src/shaders/square.fragment.wgsl";
import vertexShader from "@/game/src/shaders/square.vertex.wgsl";

export function initSquareClientRenderer(world: World) {
  return function (component: RenderComponent) {
    const { device, lightDataSize, lightDataBuffer, cameraUniformBuffer } =
      world.getState(WebGpuRendererState);

    component.renderPipeline = device.createRenderPipeline({
      layout: "auto",
      vertex: {
        module: device.createShaderModule({ code: vertexShader }),
        entryPoint: "main",
        buffers: [
          {
            arrayStride: component.stride, // ( 3 (pos) + 3 (norm) + 2 (uv) ) * 4 bytes
            attributes: [
              {
                // position
                shaderLocation: 0,
                offset: 0,
                format: "float32x3",
              },
              {
                // norm
                shaderLocation: 1,
                offset: 3 * 4,
                format: "float32x3",
              },
              {
                // uv
                shaderLocation: 2,
                offset: (3 + 3) * 4,
                format: "float32x2",
              },
            ],
          } as GPUVertexBufferLayout,
        ],
      },
      fragment: {
        module: device.createShaderModule({
          code: fragmentShader,
        }),
        entryPoint: "main",
        targets: [
          {
            format: "bgra8unorm" as GPUTextureFormat,
          },
        ],
      },
      primitive: {
        topology: "triangle-list",
        cullMode: "back",
      },
      // Enable depth testing so that the fragment closest to the camera
      // is rendered in front.
      depthStencil: {
        depthWriteEnabled: true,
        depthCompare: "less",
        format: "depth24plus-stencil8",
      },
    } as unknown as GPURenderPipelineDescriptor);

    const { vertices } = component;

    component.verticesBuffer = device.createBuffer({
      label: "[vertexBuffer]",
      size: component.vertices.length * component.stride,
      usage: GPUBufferUsage.VERTEX,
      mappedAtCreation: true,
    });

    const mapping = new Float32Array(component.verticesBuffer.getMappedRange());
    for (let i = 0; i < vertices.length; i++) {
      // (3 * 4) + (3 * 4) + (2 * 4)
      mapping.set(
        [
          vertices[i].pos[0], //* component.scaleX,
          vertices[i].pos[1], //* component.scaleY,
          vertices[i].pos[2], //* component.scaleZ,
        ],
        component.perVertex * i + 0
      );
      mapping.set(vertices[i].norm, component.perVertex * i + 3);
      mapping.set(vertices[i].uv, component.perVertex * i + 6);
    }

    component.verticesBuffer.unmap();

    component.transformationBuffer = device.createBuffer({
      size: component.uniformBufferSize,
      usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
    });

    component.colorBuffer = device.createBuffer({
      mappedAtCreation: true,
      size: Float32Array.BYTES_PER_ELEMENT * 3 + 4,
      usage: GPUBufferUsage.STORAGE,
    });
    const colorMapping = new Float32Array(
      component.colorBuffer.getMappedRange()
    );
    // colorMapping.set(
    //   color
    //     ? [color.r, color.g, color.b]
    //     : [this.defaultColor.r, this.defaultColor.g, this.defaultColor.b],
    //   0
    // );
    colorMapping.set([0.9, 0.6, 0.15], 0);
    component.colorBuffer.unmap();

    const entries = [
      {
        binding: 0,
        resource: {
          buffer: component.transformationBuffer,
          offset: 0,
          size: component.matrixSize * 2,
        },
      },
      {
        binding: 1,
        resource: {
          buffer: component.colorBuffer,
          offset: 0,
          size: Float32Array.BYTES_PER_ELEMENT * 3 + 4,
        },
      },
      {
        binding: 2,
        resource: {
          buffer: cameraUniformBuffer,
          offset: 0,
          size: component.matrixSize,
        },
      },
      {
        binding: 3,
        resource: {
          buffer: lightDataBuffer,
          offset: 0,
          size: lightDataSize,
        },
      },
    ];

    // TODO Textures

    component.transformationBindGroup = device.createBindGroup({
      layout: component.renderPipeline.getBindGroupLayout(0),
      entries: entries as Iterable<GPUBindGroupEntry>,
    });

    return {};
  };
}
