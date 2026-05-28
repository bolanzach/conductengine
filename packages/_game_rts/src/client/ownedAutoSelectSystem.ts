import type { Query, Not } from "@conduct/ecs";
import { ConductAddComponent } from "@conduct/ecs";
import { Networked } from "@conduct/networking/replication";
import { getLocalPlayerId } from "@conduct/networking/clientNetworkReceive";
import { SelectedTag } from "./selected";

export default function OwnedAutoSelectSystem(query: Query<[Networked, Not<[SelectedTag]>]>) {
  const playerId = getLocalPlayerId();
  if (playerId === 0) return;

  query.iter(([entity, networked]) => {
    if (networked.owner === playerId) {
      ConductAddComponent(entity, SelectedTag);
    }
  });
}