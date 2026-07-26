import { ConductAddComponent, ConductSpawnBundle, ChildOf, getBundleComponents, getBundleChildren } from "@conduct/ecs";
import type { ConductBundle } from "@conduct/ecs";
import { getLocalId, setEntityMapping } from "./clientEntityMap.js";
import { getReplicatedComponents, getEntityRefFields } from "./replication.js";
import { consumeLatestSnapshot, getClientBundle } from "./clientNetworkReceive.js";
import type { SnapshotEntity, SerializePrimitive } from "./protocol.js";

interface SpawnedNode {
  localId: number;
  serverNode: SnapshotEntity;
}

/**
 * Pass 1: Recursively spawn entities from client bundles matched to server data.
 * Establishes entity ID mappings and ChildOf hierarchy. Does NOT apply component
 * overrides yet (entity refs may not be fully mapped).
 *
 * Children are matched by Networked.index position: server children sorted by
 * index are paired 1:1 with the client bundle's nested child bundles.
 */
function spawnNode(
  clientBundle: ConductBundle,
  serverNode: SnapshotEntity,
  spawned: SpawnedNode[],
  parentLocalId?: number,
): void {
  let localId = getLocalId(serverNode.entityId);

  if (localId === undefined) {
    // Spawn from client bundle components only (no children — tree defines hierarchy)
    localId = ConductSpawnBundle(getBundleComponents(clientBundle));
    setEntityMapping({ serverId: serverNode.entityId, localId });
  }

  if (parentLocalId !== undefined) {
    ConductAddComponent(localId, ChildOf, { parent: parentLocalId });
  }

  spawned.push({ localId, serverNode });

  // Match children by Networked.index position
  const clientChildren = getBundleChildren(clientBundle);
  if (clientChildren.length > 0 && serverNode.children.length > 0) {
    // Sort server children by Networked.index for deterministic positional matching
    const sorted = serverNode.children.slice().sort((a, b) => {
      const aIdx = (a.components[0]?.index as number) ?? 0;
      const bIdx = (b.components[0]?.index as number) ?? 0;
      return aIdx - bIdx;
    });

    const count = Math.min(clientChildren.length, sorted.length);
    for (let i = 0; i < count; i++) {
      spawnNode(clientChildren[i]!, sorted[i]!, spawned, localId);
    }
  }
}

/**
 * Pass 2: Apply server component overrides with entity ref translation.
 * All entity ID mappings are established by this point.
 */
function applyOverrides(
  spawned: SpawnedNode[],
  replicatedComponents: readonly (new () => object)[],
): void {
  for (let i = 0; i < spawned.length; i++) {
    const { localId, serverNode } = spawned[i]!;

    for (const key in serverNode.components) {
      const numId = Number(key);
      const data = serverNode.components[numId]! as Record<string, SerializePrimitive>;

      // Translate entity reference fields from server IDs to local IDs
      const refs = getEntityRefFields(numId);
      if (refs) {
        for (let r = 0; r < refs.length; r++) {
          const field = refs[r]!;
          const serverRefId = (data as any)[field] as number;
          const localRefId = getLocalId(serverRefId);
          if (localRefId !== undefined) {
            (data as any)[field] = localRefId;
          }
        }
      }

      ConductAddComponent(localId, replicatedComponents[numId]!, data);
    }
  }
}

export default function ClientNetworkReceiveSystem() {
  const snapshot = consumeLatestSnapshot();
  if (!snapshot) return;

  const replicatedComponents = getReplicatedComponents();
  const spawned: SpawnedNode[] = [];

  // Pass 1: Spawn entities and build ID mappings
  // Roots are server-driven (only server knows what top-level entities exist)
  for (let i = 0; i < snapshot.roots.length; i++) {
    const root = snapshot.roots[i]!;
    const bundleId = root.components[0]?.bundle as number;
    const clientBundle = getClientBundle(bundleId);
    if (!clientBundle) continue;

    spawnNode(clientBundle, root, spawned);
  }

  // Pass 2: Apply component overrides (entity refs now resolvable)
  applyOverrides(spawned, replicatedComponents);
}
