import type { Snapshot } from "./protocol.js";
import type { ConductBundle } from "./replication.js";

let bundles: Record<number, ConductBundle> = {};

export function setClientBundles(b: Record<number, ConductBundle>): void {
  bundles = b;
}

export function getClientBundle(id: number): ConductBundle | undefined {
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