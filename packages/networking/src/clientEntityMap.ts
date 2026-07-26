/**
 * Bidirectional mapping between server entity IDs and local entity IDs.
 * Used on the client to translate between server-authoritative IDs
 * and local ECS entity IDs.
 */
const serverToLocal: (number | undefined)[] = [];
const localToServer: (number | undefined)[] = [];

export function getLocalId(serverId: number): number | undefined {
  return serverToLocal[serverId];
}

export function getServerId(localId: number): number | undefined {
  return localToServer[localId];
}

export function setEntityMapping(ids: { serverId: number; localId: number }): void {
  serverToLocal[ids.serverId] = ids.localId;
  localToServer[ids.localId] = ids.serverId;
}

export function removeEntityMapping(ids: { serverId: number }): void {
  const localId = serverToLocal[ids.serverId];
  if (localId !== undefined) {
    localToServer[localId] = undefined;
  }
  serverToLocal[ids.serverId] = undefined;
}