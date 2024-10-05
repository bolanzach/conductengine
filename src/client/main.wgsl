@group(0) @binding(0) var<uniform> grid: vec2f;

@vertex
fn vmain(@location(0) pos: vec2f) -> @builtin(position) vec4f {
  return vec4f(pos / grid, 0, 1);

}

@fragment
fn fmain() -> @location(0) vec4f {
  return vec4f(1.0, 0.0, 0.0, 1.0);
}