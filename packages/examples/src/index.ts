import { ConductAddComponent, ConductRegisterSystem, ConductSpawnEntity, ConductStart } from "@conduct/ecs";
import InputSystem, { listenForInput, Transform3D } from "@conduct/simulation";
import { Camera } from "@conduct/renderer/components/camera";
import { Material } from "@conduct/renderer/components/material";
import { MeshRenderer } from "@conduct/renderer/components/meshRenderer";
import { initRenderer } from "@conduct/renderer/webGpu";
import CameraSystem from "@conduct/renderer/systems/cameraSystem";
import RendererSystem from "@conduct/renderer/systems/rendererSystem";
import { Rotator } from "./rotator";
import RotatorSystem from "./rotatorSystem";
import { PlayerTag } from "./playerTag";
import PlayerMovementSystem from "./playerMovementSystem";
import PlayerShootSystem from "./playerShootSystem";
import BulletMovementSystem from "./bulletMovementSystem";
import { MESH } from "@conduct/renderer/mesh";

const canvas = document.getElementById("conduct") as HTMLCanvasElement;
await initRenderer(canvas);
listenForInput();

const camera = ConductSpawnEntity();
ConductAddComponent(camera, Transform3D, { y: 12, z: 8, rx: -0.85 });
ConductAddComponent(camera, Camera, { aspect: 800 / 600 });

const cube = ConductSpawnEntity();
ConductAddComponent(cube, Transform3D);
ConductAddComponent(cube, MeshRenderer, { meshId: MESH.CUBE });
ConductAddComponent(cube, Material, { r: 0.2, g: 0.6, b: 1.0 });
ConductAddComponent(cube, PlayerTag)


const cube2 = ConductSpawnEntity();
ConductAddComponent(cube2, Transform3D, { sx: 10, sy: 0.2, sz: 10 });
ConductAddComponent(cube2, MeshRenderer, { meshId: MESH.CUBE });
ConductAddComponent(cube2, Material, { r: 0.8, g: 0.6, b: 0.3 });
ConductAddComponent(cube2, Rotator);

const sphere = ConductSpawnEntity();
ConductAddComponent(sphere, Transform3D, { x: 1.8 });
ConductAddComponent(sphere, MeshRenderer, { meshId: MESH.SPHERE });
ConductAddComponent(sphere, Material, { r: 0.2, g: 0.6, b: 0.3 });
ConductAddComponent(sphere, Rotator);

ConductRegisterSystem(InputSystem);
ConductRegisterSystem(CameraSystem);
ConductRegisterSystem(RotatorSystem);
ConductRegisterSystem(PlayerMovementSystem);
ConductRegisterSystem(PlayerShootSystem);
ConductRegisterSystem(BulletMovementSystem);
ConductRegisterSystem(RendererSystem);

ConductStart();
