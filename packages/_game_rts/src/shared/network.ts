import { ConductNetworkReplicateComponent } from "@conduct/networking/replication";
import { Networked } from "@conduct/networking/networked";
import { Transform3D } from "@conduct/simulation";

export function replicateComponents() {
  ConductNetworkReplicateComponent(Networked);
  ConductNetworkReplicateComponent(Transform3D);
}
