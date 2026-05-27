import type { Query } from "@conduct/ecs";
import { tick } from "@conduct/ecs";
import { Inputs } from "@conduct/simulation";
import { getClientTransport } from "@conduct/networking/transport";
import { getServerId } from "@conduct/networking/entityMap";
import { screenToRay, rayPlaneY } from "@conduct/renderer/raycast";
import { SelectedTag } from "./selected";

export default function RtsInputSystem(query: Query<[SelectedTag]>) {
  const transport = getClientTransport();
  if (!transport) return;

  const rightClick = Inputs.getMouseEvent(2);
  if (!rightClick) return;

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

  transport.send({
    type: 'command',
    payload: {
      type: 'move',
      playerId: 0,
      tick,
      data: { entities, x: hit.x, z: hit.z },
    },
  });
}