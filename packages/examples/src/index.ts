import {
  ConductAddComponent,
  ConductGetComponent,
  ConductRegisterSystem, ConductSetComponent,
  ConductSpawnEntity,
  ConductStart,
  FixedUpdate,
  Update,
} from "@conduct/ecs";
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
import CameraPanSystem from "./cameraPanSystem";
import { CameraPan } from "./cameraPan";
import { MESH } from "@conduct/renderer/mesh";

const canvas = document.getElementById("conduct") as HTMLCanvasElement;
await initRenderer(canvas);
listenForInput();

const camera = ConductSpawnEntity();
ConductAddComponent(camera, Transform3D, { y: 20, z: 15, rx: -1.0 });
ConductAddComponent(camera, Camera, { aspect: 800 / 600, far: 200 });
ConductAddComponent(camera, CameraPan);

const cube = ConductSpawnEntity();
ConductAddComponent(cube, Transform3D);
ConductAddComponent(cube, MeshRenderer, { meshId: MESH.CUBE });
ConductAddComponent(cube, Material, { r: 0.2, g: 0.6, b: 1.0 });
ConductAddComponent(cube, PlayerTag)

const ground = ConductSpawnEntity();
ConductAddComponent(ground, Transform3D, { sx: 30, sy: 0.2, sz: 30 });
ConductAddComponent(ground, MeshRenderer, { meshId: MESH.CUBE });
ConductAddComponent(ground, Material, { r: 0.1, g: 0.5, b: 0.3 });

const sphere = ConductSpawnEntity();
ConductAddComponent(sphere, Transform3D, { x: 1.8 });
ConductAddComponent(sphere, MeshRenderer, { meshId: MESH.SPHERE });
ConductAddComponent(sphere, Material, { r: 0.2, g: 0.6, b: 0.3 });
ConductAddComponent(sphere, Rotator);

ConductRegisterSystem(FixedUpdate, InputSystem);
ConductRegisterSystem(FixedUpdate, CameraPanSystem);
ConductRegisterSystem(FixedUpdate, RotatorSystem);
ConductRegisterSystem(FixedUpdate, PlayerMovementSystem);
ConductRegisterSystem(FixedUpdate, PlayerShootSystem);
ConductRegisterSystem(FixedUpdate, BulletMovementSystem);
ConductRegisterSystem(Update, CameraSystem);
ConductRegisterSystem(Update, RendererSystem);

ConductStart(60);

setTimeout(() => {
  debugger;

  const t = ConductGetComponent(cube, Transform3D)!;

  ConductSetComponent(cube, Transform3D, { sx: 3 });


}, 1000)
