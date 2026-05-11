export const BASIC_SHADER = `
struct Uniforms {
  model : mat4x4<f32>,
  view : mat4x4<f32>,
  projection : mat4x4<f32>,
  color : vec4<f32>,
};

@group(0) @binding(0) var<uniform> uniforms : Uniforms;

struct VertexOutput {
  @builtin(position) position : vec4<f32>,
};

@vertex
fn vs(@location(0) pos : vec3<f32>) -> VertexOutput {
  var out : VertexOutput;
  out.position = uniforms.projection * uniforms.view * uniforms.model * vec4<f32>(pos, 1.0);
  return out;
}

@fragment
fn fs() -> @location(0) vec4<f32> {
  return uniforms.color;
}
`;