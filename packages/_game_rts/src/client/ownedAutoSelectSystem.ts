import type { Query, Not } from "@conduct/ecs";
import { ConductAddComponent } from "@conduct/ecs";
import { Networked } from "@conduct/networking/networked";
import { getLocalPlayerId } from "@conduct/networking/clientNetworkReceive";
import { SelectedTag } from "./selected";
import { SquadMember } from "../shared/squadMember";

export default function OwnedAutoSelectSystem(query: Query<[Networked, Not<[SelectedTag, SquadMember]>]>) {
  const playerId = getLocalPlayerId();

  query.iter(([entity, networked]) => {
    if (networked.owner === playerId) {
      ConductAddComponent(entity, SelectedTag);
    }
  });
}