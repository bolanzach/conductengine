export type SerializePrimitive = boolean | number;

export type ReplicatedComponentId = number;

export type ReplicatedComponentData = Record<string, SerializePrimitive>;

export interface SnapshotEntity {
  entityId: number;
  components: Record<ReplicatedComponentId, ReplicatedComponentData>;
  children: SnapshotEntity[];
}

export interface GameCommand<T extends Record<string, unknown> = Record<string, unknown>> {
  type: string;
  playerId: number;
  tick: number;
  data: T;
}

export interface Snapshot {
  tick: number;
  roots: SnapshotEntity[];
  destroyed: number[];
}

export interface ConnectPayload {
  playerName: string;
}

export interface ConnectedPayload {
  playerId: number;
  tick: number;
}

// Client → Server
export type ToServerMessage =
  | { type: 'command'; payload: GameCommand }
  | { type: 'connect'; payload: ConnectPayload };

// Server → Client
export type ToClientMessage =
  | { type: 'connected'; payload: ConnectedPayload }
  | { type: 'snapshot'; payload: Snapshot }
  | { type: 'commands'; payload: { tick: number; commands: GameCommand[] } };