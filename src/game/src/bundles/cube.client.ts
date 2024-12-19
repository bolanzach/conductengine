import { World } from "@/conduct-ecs";
import RenderComponent from "@/conduct-ecs/components/renderComponent";
import { WebGpuRendererState } from "@/conduct-ecs/systems/client/render/webGpuRendererInitSystem.client";
import cubeFragmentShader from "@/game/src/shaders/cube.fragment.wgsl";
import cubeVertexShader from "@/game/src/shaders/cube.vertex.wgsl";

export function initCubeClientRenderer(world: World) {
  return function (component: RenderComponent): RenderComponent {
    //this.setTransformation(parameter);

    const { vertices } = component;
    const { device, cameraUniformBuffer, lightDataBuffer } =
      world.getState(WebGpuRendererState);

    component.renderPipeline = device.createRenderPipeline({
      layout: "auto",
      vertex: {
        module: device.createShaderModule({ code: cubeVertexShader }),
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
          code: cubeFragmentShader,
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

    component.verticesBuffer = device.createBuffer({
      size: component.vertices.length * component.stride,
      usage: GPUBufferUsage.VERTEX,
      mappedAtCreation: true,
    });

    const mapping = new Float32Array(component.verticesBuffer.getMappedRange());
    for (let i = 0; i < vertices.length; i++) {
      // (3 * 4) + (3 * 4) + (2 * 4)
      mapping.set(
        [
          vertices[i].pos[0] * 2, //component.scaleX,
          vertices[i].pos[1] * 2, //component.scaleY,
          vertices[i].pos[2] * 2, //component.scaleZ,
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
    colorMapping.set(
      [component.color.r, component.color.g, component.color.b],
      0
    );
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
          size: 3 * 4 + 4, // lightDataSize vec3 size in bytes,
        },
      },
    ];

    // Texture
    // if (imageBitmap) {
    //   const cubeTexture = device.createTexture({
    //     size: [imageBitmap.width, imageBitmap.height, 1],
    //     format: "rgba8unorm",
    //     usage:
    //       GPUTextureUsage.TEXTURE_BINDING |
    //       GPUTextureUsage.COPY_DST |
    //       GPUTextureUsage.RENDER_ATTACHMENT,
    //   });
    //   device.queue.copyExternalImageToTexture(
    //     { source: imageBitmap },
    //     { texture: cubeTexture },
    //     [imageBitmap.width, imageBitmap.height, 1]
    //   );
    //   const sampler = device.createSampler({
    //     magFilter: "linear",
    //     minFilter: "linear",
    //   });
    //
    //   entries.push({
    //     binding: 4,
    //     resource: sampler,
    //   } as any);
    //   entries.push({
    //     binding: 5,
    //     resource: cubeTexture.createView(),
    //   } as any);
    // }

    component.transformationBindGroup = device.createBindGroup({
      layout: component.renderPipeline.getBindGroupLayout(0),
      entries: entries as Iterable<GPUBindGroupEntry>,
    });

    return component;
  };
}
