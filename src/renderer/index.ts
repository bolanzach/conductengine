
if (!navigator.gpu) {
  throw new Error("WebGPU is not supported on this device.");
}

console.info("Starting app");

const GRID_SIZE = 4;


export async function init() {
  const adapter = await navigator.gpu.requestAdapter();
  const device = await adapter?.requestDevice();
  if (!device) {
    throw new Error("No device found.");
  }

  const canvas = document.getElementById("canvas") as HTMLCanvasElement;
  const context = canvas.getContext("webgpu");
  if (!context) {
    throw new Error("Could not get WebGPU context.");
  }

  const canvasFormat = navigator.gpu.getPreferredCanvasFormat();
  context.configure({
    device: device,
    format: canvasFormat,
  });
  const encoder = device.createCommandEncoder()

  const pass = encoder.beginRenderPass({
    label: '[renderpass]',
    colorAttachments: [
      {
        view: context.getCurrentTexture().createView(),
        loadOp: 'clear',
        storeOp: 'store',
        clearValue: { r: 0.0, g: 0.15, b: 0.6, a: 1.0 }
      }
    ]
  });

  const uniform = new Float32Array([GRID_SIZE, GRID_SIZE]);
  const uniformBuffer = device.createBuffer({
    label: '[uniformbuffer]',
    size: uniform.byteLength,
    usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
  });
  device.queue.writeBuffer(uniformBuffer, 0, uniform);


  const vertices = new Float32Array([
    -0.8, -0.8,
    0.8, -0.8,
    0.8,  0.8,

    -0.8, -0.8,
    0.8,  0.8,
    -0.8,  0.8,
  ]);

  const vertexBuffer = device.createBuffer({
    label: 'A Vertex Buffer',
    size: vertices.byteLength,
    usage: GPUBufferUsage.VERTEX | GPUBufferUsage.COPY_DST,
  });

  device.queue.writeBuffer(vertexBuffer, 0, vertices);

  const vertexBufferLayout: GPUVertexBufferLayout = {
    arrayStride: 8,
    attributes: [{
      format: "float32x2",
      offset: 0,
      shaderLocation: 0, // Position, see vertex shader
    }],
  };

  const cellShaderModule = device.createShaderModule({
    label: "[cellshader]",
    code: `
    @group(0) @binding(0) var<uniform> grid: vec2f;
    
    @vertex
    fn vmain(@location(0) pos: vec2f) -> @builtin(position) vec4f {
      // Add 1 to the position before dividing by the grid size.
      let gridPos = (pos + 1) / grid - 1;

      return vec4f(gridPos, 0, 1);
    }
    
    @fragment
    fn fmain() -> @location(0) vec4f {
      return vec4f(1.0, 0.0, 0.0, 1.0);
    }
    `
  });

  const cellPipeline = device.createRenderPipeline({
    label: "[cellpipeline]",
    layout: 'auto',
    vertex: {
      module: cellShaderModule,
      entryPoint: "vmain",
      buffers: [vertexBufferLayout],
    },
    fragment: {
      module: cellShaderModule,
      entryPoint: "fmain",
      targets: [{
        format: canvasFormat,
      }],
    },
  });
  const bindGroup = device.createBindGroup({
    label: "[bindgroup]",
    layout: cellPipeline.getBindGroupLayout(0),
    entries: [{
      binding: 0,
      resource: {
        buffer: uniformBuffer,
      }
    }]
  });

  pass.setPipeline(cellPipeline);
  pass.setVertexBuffer(0, vertexBuffer);
  pass.setBindGroup(0, bindGroup);
  pass.draw(vertices.length / 2, 1, 0, 0);

  pass.end();

  device.queue.submit([encoder.finish()]); // typically done in one step


}