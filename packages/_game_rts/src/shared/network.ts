import { ConductNetworkReplicateComponent, Networked } from "@conduct/networking/replication";
import { Transform3D } from "@conduct/simulation";

export function replicateComponents() {
  ConductNetworkReplicateComponent(Networked);
  ConductNetworkReplicateComponent(Transform3D);
}
