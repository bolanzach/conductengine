export type SerializePrimitive = boolean | number;

type ReplicatedComponentId = number;

type ReplicatedComponentData = Record<string, SerializePrimitive>;

export interface SerializedEntity {
  id: number;
  components: Record<ReplicatedComponentId, ReplicatedComponentData>;
}

export interface GameCommand<T extends Record<string, unknown> = Record<string, unknown>> {
  type: string;
  playerId: number;
  tick: number;
  data: T;
}

export interface Snapshot {
  tick: number;
  entities: SerializedEntity[];
  destroyed: number[];
}

export interface ConnectPayload {
  playerName: string;
}

export interface ConnectedPayload {
  playerId: number;
  tick: number;
}

export type NetworkMessage =
  | { type: 'command'; payload: GameCommand }
  | { type: 'snapshot'; payload: Snapshot }
  | { type: 'connect'; payload: ConnectPayload }
  | { type: 'connected'; payload: ConnectedPayload };
