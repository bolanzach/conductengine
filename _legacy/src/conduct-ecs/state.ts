export const STATE_ID = Symbol("STATE_ID");

export interface StateKey<T> {
  [STATE_ID]: number;
  type: T;
}

let stateCounter = 0;

export function createState<T>(): StateKey<T> {
  return {
    [STATE_ID]: stateCounter++,
    type: undefined as unknown as T,
  };
}
