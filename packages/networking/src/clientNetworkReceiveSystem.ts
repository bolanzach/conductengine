import { ConductSetComponent } from "@conduct/ecs";
import { getLocalId, setEntityMapping } from "./entityMap.js";
import { getReplicatedComponents } from "./replication.js";
import { consumeLatestSnapshot, getClientBundle } from "./clientNetworkReceive.js";

export default function ClientNetworkReceiveSystem() {
  const snapshot = consumeLatestSnapshot();
  if (!snapshot) return;

  const replicatedComponents = getReplicatedComponents();

  for (let i = 0; i < snapshot.entities.length; i++) {
    const entity = snapshot.entities[i]!
    const bundleId = entity.components[0]?.bundle as number;

    let localId = getLocalId(entity.id);

    // New entity — spawn via bundle
    if (localId === undefined) {
      const bundle = getClientBundle(bundleId);
      if (!bundle) return;
      localId = bundle();
      setEntityMapping({ serverId: entity.id, localId });
    }

    // Apply replicated component data
    for (const id in entity.components) {
      const numId = Number(id);
      if (numId === 0) continue; // skip bundle metadata
      ConductSetComponent(localId, replicatedComponents[numId - 1]!, entity.components[numId]!);
    }
  }
}
