import { ConductAddComponent } from "@conduct/ecs";
import { getLocalId, setEntityMapping } from "./entityMap.js";
import { getReplicatedComponents } from "./replication.js";
import { consumeLatestSnapshot, getClientBundle } from "./clientNetworkReceive.js";

export default function ClientNetworkReceiveSystem() {
  const snapshot = consumeLatestSnapshot();
  if (!snapshot) return;

  const replicatedComponents = getReplicatedComponents();

  for (let i = 0; i < snapshot.entities.length; i++) {
    const entity = snapshot.entities[i]!;
    const bundleId = entity.components[0]?.bundle as number;

    let localId = getLocalId(entity.id);

    // New entity — spawn via bundle
    if (localId === undefined) {
      const bundle = getClientBundle(bundleId);
      if (!bundle) continue;
      localId = bundle();
      setEntityMapping({ serverId: entity.id, localId });
    }

    // Apply all replicated component data
    for (const id in entity.components) {
      const numId = Number(id);
      ConductAddComponent(localId, replicatedComponents[numId]!, entity.components[numId]!);
    }
  }
}
