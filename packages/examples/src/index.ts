import { ConductAddComponent, ConductRegisterSystem, ConductSpawnEntity, ConductStart } from "@conduct/ecs";
import InputSystem, { listenForInput, Transform3D } from "@conduct/simulation";
import { Camera } from "@conduct/renderer/components/camera";
import { Material } from "@conduct/renderer/components/material";
import { MeshRenderer } from "@conduct/renderer/components/meshRenderer";
import { initRenderer, registerMesh } from "@conduct/renderer/webGpu";
import { createCubeGeometry } from "@conduct/renderer/geometry/cube";
import CameraSystem from "@conduct/renderer/systems/cameraSystem";
import RendererSystem from "@conduct/renderer/systems/rendererSystem";
import { Rotator } from "./rotator";
import RotatorSystem from "./rotatorSystem";
import { PlayerTag } from "./playerTag";
import PlayerMovementSystem from "./playerMovementSystem";

const canvas = document.getElementById("conduct") as HTMLCanvasElement;
await initRenderer(canvas);
listenForInput();

const cubeMeshId = registerMesh(createCubeGeometry());

const camera = ConductSpawnEntity();
ConductAddComponent(camera, Transform3D, { z: 11 });
ConductAddComponent(camera, Camera, { aspect: 800 / 600 });

const cube = ConductSpawnEntity();
ConductAddComponent(cube, Transform3D);
ConductAddComponent(cube, MeshRenderer, { meshId: cubeMeshId });
ConductAddComponent(cube, Material, { r: 0.2, g: 0.6, b: 1.0 });
ConductAddComponent(cube, PlayerTag)


const cube2 = ConductSpawnEntity();
ConductAddComponent(cube2, Transform3D);
ConductAddComponent(cube2, MeshRenderer, { meshId: cubeMeshId });
ConductAddComponent(cube2, Material, { r: 0.8, g: 0.6, b: 0.3 });
ConductAddComponent(cube2, Rotator);

ConductRegisterSystem(InputSystem);
ConductRegisterSystem(CameraSystem);
ConductRegisterSystem(RotatorSystem);
ConductRegisterSystem(PlayerMovementSystem);
ConductRegisterSystem(RendererSystem);

ConductStart();
