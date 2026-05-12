import { mat4Multiply, mat4Invert } from "./webGpu.js";
import { viewMatrix, projMatrix } from "./systems/cameraSystem.js";

export interface Ray {
  ox: number; oy: number; oz: number;
  dx: number; dy: number; dz: number;
}

const invProjView = new Float32Array(16);
const projView = new Float32Array(16);

export function screenToRay(screenX: number, screenY: number, canvasWidth: number, canvasHeight: number): Ray {
  const nx = (2 * screenX) / canvasWidth - 1;
  const ny = 1 - (2 * screenY) / canvasHeight;

  mat4Multiply(projView, projMatrix, viewMatrix);
  mat4Invert(invProjView, projView);

  // Near point (z = -1 in NDC)
  const nearW = invProjView[3]! * nx + invProjView[7]! * ny + invProjView[11]! * -1 + invProjView[15]!;
  const nearX = (invProjView[0]! * nx + invProjView[4]! * ny + invProjView[8]! * -1 + invProjView[12]!) / nearW;
  const nearY = (invProjView[1]! * nx + invProjView[5]! * ny + invProjView[9]! * -1 + invProjView[13]!) / nearW;
  const nearZ = (invProjView[2]! * nx + invProjView[6]! * ny + invProjView[10]! * -1 + invProjView[14]!) / nearW;

  // Far point (z = 1 in NDC)
  const farW = invProjView[3]! * nx + invProjView[7]! * ny + invProjView[11]! * 1 + invProjView[15]!;
  const farX = (invProjView[0]! * nx + invProjView[4]! * ny + invProjView[8]! * 1 + invProjView[12]!) / farW;
  const farY = (invProjView[1]! * nx + invProjView[5]! * ny + invProjView[9]! * 1 + invProjView[13]!) / farW;
  const farZ = (invProjView[2]! * nx + invProjView[6]! * ny + invProjView[10]! * 1 + invProjView[14]!) / farW;

  // Direction
  let dx = farX - nearX;
  let dy = farY - nearY;
  let dz = farZ - nearZ;
  const len = Math.sqrt(dx * dx + dy * dy + dz * dz);
  dx /= len;
  dy /= len;
  dz /= len;

  return { ox: nearX, oy: nearY, oz: nearZ, dx, dy, dz };
}

export function rayPlaneY(ray: Ray, planeY: number): { x: number; y: number; z: number } | null {
  if (Math.abs(ray.dy) < 1e-8) return null;
  const t = (planeY - ray.oy) / ray.dy;
  if (t < 0) return null;
  return {
    x: ray.ox + ray.dx * t,
    y: planeY,
    z: ray.oz + ray.dz * t,
  };
}