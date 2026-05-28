import type { Query, Not } from "@conduct/ecs";
import { ConductAddComponent } from "@conduct/ecs";
import { Networked } from "@conduct/networking/replication";
import { getLocalPlayerId } from "@conduct/networking/clientNetworkReceive";
import { SelectedTag } from "./selected";

export default function OwnedAutoSelectSystem(query: Query<[Networked, Not<[SelectedTag]>]>) {
  const playerId = getLocalPlayerId();
  if (playerId === 0) return;

  query.iter(([entity, networked]) => {
    console.log(networked.owner, playerId)
    if (networked.owner === playerId) {
      console.log(`[client] auto-selecting owned entity ${entity}`);
      ConductAddComponent(entity, SelectedTag);
    }
  });
}