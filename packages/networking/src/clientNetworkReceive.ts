import type { Snapshot } from "./protocol.js";
import type { Bundle } from "./replication.js";

let bundles: Record<number, Bundle> = {};

export function setClientBundles(b: Record<number, Bundle>): void {
  bundles = b;
}

export function getClientBundle(id: number): Bundle | undefined {
  return bundles[id];
}

const snapshotBuffer: Snapshot[] = [];

export function pushSnapshot(snapshot: Snapshot): void {
  snapshotBuffer.push(snapshot);
}

export function consumeLatestSnapshot(): Snapshot | undefined {
  if (snapshotBuffer.length === 0) return undefined;
  const snapshot = snapshotBuffer[snapshotBuffer.length - 1]!;
  snapshotBuffer.length = 0;
  return snapshot;
}