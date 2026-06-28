import { Query, ConductGetComponent, tick } from "@conduct/ecs";
import { getReplicatedComponents } from "./replication.js";
import { Networked } from "./networked.js";
import type { SerializedEntity, SerializePrimitive } from "./protocol.js";
import { getServerTransport } from "./serverTransport.js";

export let snapshotEntities: SerializedEntity[] = [];

export default function ServerNetworkSnapshotSystem(query: Query<[Networked]>) {
  const replicatedComponents = getReplicatedComponents();
  snapshotEntities.length = 0;

  query.iter(([entity]) => {
    const components: Record<number, Record<string, SerializePrimitive>> = {};

    for (let i = 0; i < replicatedComponents.length; i++) {
      const data = ConductGetComponent(entity, replicatedComponents[i]!);
      if (data) {
        components[i] = data;
      }
    }

    snapshotEntities.push({ id: entity, components });
  });

  const transport = getServerTransport();
  if (!transport || snapshotEntities.length === 0) return;

  transport.broadcast({
    type: 'snapshot',
    payload: {
      tick,
      entities: snapshotEntities,
      destroyed: [],
    },
  });
}