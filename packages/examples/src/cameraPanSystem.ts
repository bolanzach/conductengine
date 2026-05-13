import { Query } from "@conduct/ecs";
import { Inputs, Transform3D } from "@conduct/simulation";
import { CameraPan } from "./cameraPan";

let canvasRect: DOMRect | null = null;

function getCanvasRect(): DOMRect | null {
  if (!canvasRect) {
    const canvas = document.getElementById("conduct") as HTMLCanvasElement;
    if (canvas) canvasRect = canvas.getBoundingClientRect();
  }
  return canvasRect;
}

export default function CameraPanSystem(query: Query<[Transform3D, CameraPan]>) {
  const rect = getCanvasRect();
  if (!rect) return;

  const mouse = Inputs.getMousePosition();
  const localX = mouse.x - rect.left;
  const localY = mouse.y - rect.top;

  query.iter(([_, transform, cameraPan]) => {
    const panSpeed = cameraPan.panSpeed;
    const edgeThreshold = cameraPan.edgeThreshold;

    let panX = 0;
    let panZ = 0;

    if (localX >= 0 && localX < edgeThreshold) panX = -panSpeed;
    else if (localX > rect.width - edgeThreshold && localX <= rect.width) panX = panSpeed;

    if (localY >= 0 && localY < edgeThreshold) panZ = -panSpeed;
    else if (localY > rect.height - edgeThreshold && localY <= rect.height) panZ = panSpeed;

    transform.x += panX;
    transform.z += panZ;
  });
}