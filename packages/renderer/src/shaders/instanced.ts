export const INSTANCED_SHADER = `
struct CameraUniforms {
  view : mat4x4<f32>,
  projection : mat4x4<f32>,
};

struct Instance {
  model : mat4x4<f32>,
  color : vec4<f32>,
};

@group(0) @binding(0) var<uniform> camera : CameraUniforms;
@group(0) @binding(1) var<storage, read> instances : array<Instance>;

struct VertexOutput {
  @builtin(position) position : vec4<f32>,
  @location(0) color : vec4<f32>,
};

@vertex
fn vs(@location(0) pos : vec3<f32>, @builtin(instance_index) instanceIdx : u32) -> VertexOutput {
  let inst = instances[instanceIdx];
  var out : VertexOutput;
  out.position = camera.projection * camera.view * inst.model * vec4<f32>(pos, 1.0);
  out.color = inst.color;
  return out;
}

@fragment
fn fs(@location(0) color : vec4<f32>) -> @location(0) vec4<f32> {
  return color;
}
`;
