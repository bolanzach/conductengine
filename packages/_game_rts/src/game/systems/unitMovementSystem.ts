import type { Query, Optional } from "@conduct/ecs";
import { deltaTime } from "@conduct/ecs";
import { Transform3D } from "@conduct/simulation";
import { Velocity } from "../velocity.js";
import { Boid } from "../boid.js";
import { SteerTarget } from "../steerTarget.js";

// Spatial hash for neighbor queries, rebuilt each frame
const CELL_SIZE = 2;
const INV_CELL = 1 / CELL_SIZE;

const cells = new Map<number, number[]>();

interface CachedPos {
  x: number;
  z: number;
}

const posCache = new Map<number, CachedPos>();

function packCell(cx: number, cz: number): number {
  return ((cz + 512) << 10) | (cx + 512);
}

const ARRIVAL_THRESHOLD = 0.05;
const SEPARATION_STRENGTH = 8;

export default function UnitMovementSystem(
  query: Query<[Transform3D, Velocity, Boid, Optional<[SteerTarget]>]>,
) {
  // Pass 1: Build spatial hash
  cells.clear();
  posCache.clear();

  query.iter(([entity, transform]) => {
    const cx = Math.floor(transform.x * INV_CELL);
    const cz = Math.floor(transform.z * INV_CELL);
    const key = packCell(cx, cz);

    let bucket = cells.get(key);
    if (!bucket) {
      bucket = [];
      cells.set(key, bucket);
    }
    bucket.push(entity);

    posCache.set(entity, { x: transform.x, z: transform.z });
  });

  // Pass 2: Seek target + separation, apply movement
  query.iter(([entity, transform, velocity, boid, steerTarget]) => {
    const dt = deltaTime;
    const sepRadSq = boid.separationRadius * boid.separationRadius;

    // Compute separation push from nearby neighbors
    const cx = Math.floor(transform.x * INV_CELL);
    const cz = Math.floor(transform.z * INV_CELL);

    let pushX = 0;
    let pushZ = 0;

    for (let dz = -1; dz <= 1; dz++) {
      for (let dx = -1; dx <= 1; dx++) {
        const key = packCell(cx + dx, cz + dz);
        const bucket = cells.get(key);
        if (!bucket) continue;

        for (let i = 0; i < bucket.length; i++) {
          const other = bucket[i]!;
          if (other === entity) continue;

          const pos = posCache.get(other)!;
          const ox = pos.x - transform.x;
          const oz = pos.z - transform.z;
          const distSq = ox * ox + oz * oz;

          if (distSq < sepRadSq && distSq > 0.0001) {
            const dist = Math.sqrt(distSq);
            const strength = 1 - dist / boid.separationRadius;
            pushX -= (ox / dist) * strength * SEPARATION_STRENGTH;
            pushZ -= (oz / dist) * strength * SEPARATION_STRENGTH;
          }
        }
      }
    }

    // Compute desired velocity: seek target at full speed
    let vx = 0;
    let vz = 0;

    if (steerTarget) {
      const dx = steerTarget.x - transform.x;
      const dz = steerTarget.z - transform.z;
      const dist = Math.sqrt(dx * dx + dz * dz);

      if (dist > ARRIVAL_THRESHOLD) {
        vx = (dx / dist) * boid.maxSpeed;
        vz = (dz / dist) * boid.maxSpeed;
      }
    }

    // Add separation
    vx += pushX;
    vz += pushZ;

    // Clamp to max speed
    const speedSq = vx * vx + vz * vz;
    if (speedSq > boid.maxSpeed * boid.maxSpeed) {
      const s = Math.sqrt(speedSq);
      vx = (vx / s) * boid.maxSpeed;
      vz = (vz / s) * boid.maxSpeed;
    }

    velocity.x = vx;
    velocity.z = vz;

    if (speedSq > 0.001) {
      transform.x = transform.x + vx * dt;
      transform.z = transform.z + vz * dt;

      // Snap facing to movement direction
      transform.ry = Math.atan2(-vx, vz);
    }
  });
}