import { World } from "@/conduct-ecs";
import RenderComponent from "@/conduct-ecs/components/renderComponent";
import { WebGpuRendererState } from "@/conduct-ecs/systems/client/render/webGpuRendererInitSystem.client";

/**
 *
 * This shader calculates and outputs position and normal vector of current fragment,
 * also outputs fragment color and uv.
 * The result is piped to fragment shader
 *
 * */
function vertxShader(): string {
  return `
            struct Uniforms {     // 4x4 transform matrices
                transform : mat4x4<f32>,    // translate AND rotate
                rotate : mat4x4<f32>,       // rotate only
            };

            struct Camera {     // 4x4 transform matrix
                matrix : mat4x4<f32>,
            };

            struct Color {        // RGB color
                color: vec3<f32>,
            };
            
            // bind model/camera/color buffers
            @group(0) @binding(0) var<uniform> modelTransform    : Uniforms;
            @group(0) @binding(2) var<uniform> cameraTransform   : Camera;
            @group(0) @binding(1) var<storage,read> color             : Color;
            
            // output struct of this vertex shader
            struct VertexOutput {
                @builtin(position) Position : vec4<f32>,

                @location(0) fragColor : vec3<f32>,
                @location(1) fragNorm : vec3<f32>,
                @location(2) uv : vec2<f32>,
                @location(3) fragPos : vec3<f32>,
            };

            // input struct according to vertex buffer stride
            struct VertexInput {
                @location(0) position : vec3<f32>,
                @location(1) norm : vec3<f32>,
                @location(2) uv : vec2<f32>,
            };
            
            @vertex
            fn main(input: VertexInput) -> VertexOutput {
                var output: VertexOutput;
                var transformedPosition: vec4<f32> = modelTransform.transform * vec4<f32>(input.position, 1.0);

                output.Position = cameraTransform.matrix * transformedPosition;             // transformed with model & camera projection
                output.fragColor = color.color;                                             // fragment color from buffer
                output.fragNorm = (modelTransform.rotate * vec4<f32>(input.norm, 1.0)).xyz; // transformed normal vector with model
                output.uv = input.uv;                                                       // transformed uv
                output.fragPos = transformedPosition.xyz;                                   // transformed fragment position with model

                return output;
            }
        `;
}

/**
 * This shader receives the output of the vertex shader program.
 * If texture is set, the sampler and texture is binded to this shader.
 * Determines the color of the current fragment, takes into account point light.
 *
 */
function fragmentShader(withTexture: boolean): string {
  // conditionally bind sampler and texture, only if texture is set
  const bindSamplerAndTexture = withTexture
    ? `
                @group(0) @binding(4) var mySampler: sampler;
                @group(0) @binding(5) var myTexture: texture_2d<f32>;
            `
    : ``;

  // conditionally do texture sampling
  const returnStatement = withTexture
    ? `
                                return vec4<f32>(textureSample(myTexture, mySampler, input.uv).xyz * lightingFactor, 1.0);
                            `
    : `
                                return vec4<f32>(input.fragColor  * lightingFactor, 1.0);
                            `;

  return (
    `
            struct LightData {        // light xyz position
                lightPos : vec3<f32>,
            };

            struct FragmentInput {              // output from vertex stage shader
                @location(0) fragColor : vec3<f32>,
                @location(1) fragNorm : vec3<f32>,
                @location(2) uv : vec2<f32>,
                @location(3) fragPos : vec3<f32>,
            };

            // bind light data buffer
            @group(0) @binding(3) var<uniform> lightData : LightData;

            // constants for light
            const ambientLightFactor : f32 = 0.25;     // ambient light
            ` +
    bindSamplerAndTexture +
    `
            @fragment
            fn main(input : FragmentInput) -> @location(0) vec4<f32> {
                let lightDirection: vec3<f32> = normalize(lightData.lightPos - input.fragPos);

                // lambert factor
                let lambertFactor : f32 = dot(lightDirection, input.fragNorm);

                var lightFactor: f32 = 0.0;
                lightFactor = lambertFactor;

                let lightingFactor: f32 = max(min(lightFactor, 1.0), ambientLightFactor);
        ` +
    returnStatement +
    `
            }
        `
  );
}

export function initCubeClientRenderer(world: World) {
  return function (component: RenderComponent): RenderComponent {
    //this.setTransformation(parameter);

    const { vertices } = component;
    const { device, cameraUniformBuffer, lightDataBuffer } =
      world.getState(WebGpuRendererState);

    component.renderPipeline = device.createRenderPipeline({
      layout: "auto",
      vertex: {
        module: device.createShaderModule({ code: vertxShader() }),
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
          code: fragmentShader(false),
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
