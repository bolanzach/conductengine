import type { Query } from "@conduct/ecs";
import { ConductGetComponent } from "@conduct/ecs";
import { Networked, getReplicatedComponents } from "./replication.js";
import type { SerializedEntity, SerializePrimitive } from "./protocol.js";

export let snapshotEntities: SerializedEntity[] = [];

export default function NetworkSnapshotSystem(query: Query<[Networked]>) {
  const replicatedComponents = getReplicatedComponents();
  snapshotEntities.length = 0;

  query.iter(([entity, networked]) => {
    const components: Record<number, Record<string, SerializePrimitive>> = {};
    components[0] = { bundle: networked.bundle };

    for (let i = 0; i < replicatedComponents.length; i++) {
      const data = ConductGetComponent(entity, replicatedComponents[i]!);
      if (data) {
        components[i + 1] = data;
      }
    }

    snapshotEntities.push({ id: entity, components });
  });
}