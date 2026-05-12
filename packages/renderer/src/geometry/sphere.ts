import { GeometryData } from './types.js';

export function createSphereGeometry(
  radius = 0.5,
  widthSegments = 32,
  heightSegments = 16,
): GeometryData {
  const positionData: number[] = [];
  const indexData: number[] = [];

  // Generate vertices
  for (let y = 0; y <= heightSegments; y++) {
    const v = y / heightSegments;
    const phi = v * Math.PI;

    for (let x = 0; x <= widthSegments; x++) {
      const u = x / widthSegments;
      const theta = u * Math.PI * 2;

      const px = -radius * Math.cos(theta) * Math.sin(phi);
      const py = radius * Math.cos(phi);
      const pz = radius * Math.sin(theta) * Math.sin(phi);

      positionData.push(px, py, pz);
    }
  }

  // Generate indices
  for (let y = 0; y < heightSegments; y++) {
    for (let x = 0; x < widthSegments; x++) {
      const a = y * (widthSegments + 1) + x;
      const b = a + widthSegments + 1;

      indexData.push(a, b, a + 1);
      indexData.push(b, b + 1, a + 1);
    }
  }

  const positions = new Float32Array(positionData);
  const indices = new Uint16Array(indexData);

  return { positions, indices };
}