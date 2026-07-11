import { deltaTime } from "@conduct/ecs";

const el = document.getElementById("fps")!;
let smoothedFps = 0;
const SMOOTHING = 0.95;

export default function FpsSystem() {
  if (deltaTime <= 0) return;
  const fps = 1 / deltaTime;
  smoothedFps = smoothedFps === 0 ? fps : smoothedFps * SMOOTHING + fps * (1 - SMOOTHING);
  el.textContent = `${Math.round(smoothedFps)} FPS`;
}