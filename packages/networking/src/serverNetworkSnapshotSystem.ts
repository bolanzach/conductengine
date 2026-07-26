import { Query, ConductGetComponent, ConductGetParent, tick } from "@conduct/ecs";
import { getReplicatedComponents } from "./replication.js";
import { Networked } from "./networked.js";
import type { SnapshotEntity, SerializePrimitive } from "./protocol.js";
import { getServerTransport } from "./serverTransport.js";

const pendingPlayers: number[] = [];

/**
 * Queue a bootstrap snapshot for a newly connected player.
 * Call `ConductRunSystem(ServerNetworkSnapshotSystem)` after to send immediately.
 */
export function queueBootstrapSnapshot(playerId: number): void {
  pendingPlayers.push(playerId);
}

export default function ServerNetworkSnapshotSystem(query: Query<[Networked]>) {
  if (pendingPlayers.length === 0) return;

  const replicatedComponents = getReplicatedComponents();

  // First pass: serialize all networked entities into a flat map
  const nodeMap = new Map<number, SnapshotEntity>();

  query.iter(([entity]) => {
    const components: Record<number, Record<string, SerializePrimitive>> = {};

    for (let i = 0; i < replicatedComponents.length; i++) {
      const data = ConductGetComponent(entity, replicatedComponents[i]!);
      if (data) {
        components[i] = data;
      }
    }

    nodeMap.set(entity, { entityId: entity, components, children: [] });
  });

  // Second pass: build tree from ChildOf relationships
  const roots: SnapshotEntity[] = [];

  for (const [entity, node] of nodeMap) {
    const parent = ConductGetParent(entity);
    if (parent !== undefined && nodeMap.has(parent)) {
      nodeMap.get(parent)!.children.push(node);
    } else {
      roots.push(node);
    }
  }

  const transport = getServerTransport();
  if (!transport || roots.length === 0) return;

  const payload = { tick, roots, destroyed: [] };

  for (let i = 0; i < pendingPlayers.length; i++) {
    transport.sendTo(pendingPlayers[i]!, { type: 'snapshot', payload });
  }

  pendingPlayers.length = 0;
}
