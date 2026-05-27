import { ConductNetworkReplicateComponent } from "@conduct/networking/replication";
import { Transform3D } from "@conduct/simulation";

export function replicateComponents() {
  ConductNetworkReplicateComponent(Transform3D);
}
