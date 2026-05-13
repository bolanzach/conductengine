import { ConductSpawnEntity, ConductAddComponent, Query, deltaTime } from "@conduct/ecs";
import { Inputs, Transform3D } from "@conduct/simulation";
import { MeshRenderer } from "@conduct/renderer/components/meshRenderer";
import { Material } from "@conduct/renderer/components/material";
import { screenToRay, rayPlaneY } from "@conduct/renderer/raycast";
import { PlayerTag } from "./playerTag";
import { Bullet } from "./bullet";
import { MESH } from "@conduct/renderer/mesh";

let cooldown = 0;
const FIRE_RATE = 0.2;
const canvas = document.getElementById("conduct") as HTMLCanvasElement;

export default function PlayerShootSystem(query: Query<[Transform3D, PlayerTag]>) {
  cooldown -= deltaTime;

  query.iter(([_, transform]) => {
    if (!Inputs.isKeyPressed('mousedown')) return;
    if (cooldown > 0) return;

    cooldown = FIRE_RATE;

    const mouse = Inputs.getMousePosition();
    const ray = screenToRay(mouse.x, mouse.y, canvas.width, canvas.height);
    const hit = rayPlaneY(ray, transform.y);

    let dx = 0;
    let dz = -1;
    if (hit) {
      dx = hit.x - transform.x;
      dz = hit.z - transform.z;
      const len = Math.sqrt(dx * dx + dz * dz);
      if (len > 0.001) {
        dx /= len;
        dz /= len;
      }
    }

    const bullet = ConductSpawnEntity();
    ConductAddComponent(bullet, Transform3D, { x: transform.x, y: transform.y, z: transform.z, sx: 0.2, sy: 0.2, sz: 0.2 });
    ConductAddComponent(bullet, MeshRenderer, { meshId: MESH.SPHERE });
    ConductAddComponent(bullet, Material, { r: 1.0, g: 0.2, b: 0.2 });
    ConductAddComponent(bullet, Bullet, { dx, dz });
  });
}