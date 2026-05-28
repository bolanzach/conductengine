import type { Query } from "@conduct/ecs";
import { tick } from "@conduct/ecs";
import { Inputs } from "@conduct/simulation";
import { getServerId } from "@conduct/networking/entityMap";
import { queueClientCommand } from "@conduct/networking/clientCommandSend";
import { screenToRay, rayPlaneY } from "@conduct/renderer/raycast";
import { SelectedTag } from "./selected";
import { getLocalPlayerId } from "@conduct/networking/clientNetworkReceive";

export default function RtsInputSystem(query: Query<[SelectedTag]>) {
  const rightClick = Inputs.getMouseEvent(2);
  if (!rightClick || rightClick.type !== 'mousedown') return;

  const canvas = rightClick.target as HTMLCanvasElement;
  const ray = screenToRay(rightClick.offsetX, rightClick.offsetY, canvas.width, canvas.height);
  const hit = rayPlaneY(ray, 0);
  if (!hit) return;

  const entities: number[] = [];
  query.iter(([entity]) => {
    const serverId = getServerId(entity);
    if (serverId !== undefined) {
      entities.push(serverId);
    }
  });

  if (entities.length === 0) return;

  queueClientCommand({
    type: 'move',
    playerId: getLocalPlayerId(),
    tick,
    data: { entities, x: hit.x, z: hit.z },
  });
}