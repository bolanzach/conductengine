import { ConductNetworkReplicateComponent } from "@conduct/networking/replication";
import { Networked } from "@conduct/networking/networked";
import { Transform3D } from "@conduct/simulation";
import { SquadMember } from "./squadMember.js";

export function replicateComponents() {
  ConductNetworkReplicateComponent(Networked);
  ConductNetworkReplicateComponent(Transform3D);
  ConductNetworkReplicateComponent(SquadMember);
}
