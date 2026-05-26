import { ConductSetComponent } from "@conduct/ecs";
import type { SerializedEntity } from "./protocol.js";
import { getLocalId, setEntityMapping } from "./entityMap.js";
import { getReplicatedComponents } from "./replication.js";
import { consumeLatestSnapshot, getClientBundle } from "./clientNetworkReceive.js";

function applyEntity(entity: SerializedEntity): void {
  const replicatedComponents = getReplicatedComponents();
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
  for (let i = 0; i < replicatedComponents.length; i++) {
    const data = entity.components[i + 1];
    if (data) {
      ConductSetComponent(localId, replicatedComponents[i]!, data);
    }
  }
}

export default function ClientNetworkReceiveSystem() {
  const snapshot = consumeLatestSnapshot();
  if (!snapshot) return;

  for (let i = 0; i < snapshot.entities.length; i++) {
    applyEntity(snapshot.entities[i]!);
  }
}
