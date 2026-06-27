
export abstract class ConductEvent {
  static readonly typeId: number;

  get typeId(): number {
    return (this.constructor as typeof ConductEvent).typeId;
  }
}

type HandlerFn = (event: any, ...args: any[]) => void;
type Handler = { fn: HandlerFn; idx: number; typeId: number };
type UnregisterHandler = Pick<Handler, 'idx' | 'typeId'>;

const handlers: Array<Array<Handler>> = [];
let nextId = 0;

export function ConductEventRegister<T extends new (...any: any) => ConductEvent>(cls: T): T {
  (cls as any).typeId = nextId++;
  handlers.push([]);
  return cls;
}

export function ConductEventRegisterHandler<E extends ConductEvent>(
  type: (new (...any: any) => E) & { typeId: number },
  handler: HandlerFn
): UnregisterHandler {
  const list = handlers[type.typeId]!;
  const entry: Handler = { fn: handler, idx: list.length, typeId: type.typeId };
  list.push(entry);
  return entry;
  // return () => {;
  //   const last = list[list.length - 1]!;
  //   last.idx = entry.idx;
  //   list[entry.idx] = last;
  //   list.pop();
  // };
}

export function ConductEventUnregisterHandler({ typeId, idx }: UnregisterHandler) {
  const list = handlers[typeId];
  if (list) {
    const last = list[list.length - 1]!;
      last.idx = idx;
      list[idx] = last;
      list.pop();
  }
}

export function ConductEventEmit<E extends ConductEvent>(event: E): void {
  const list = handlers[event.typeId];
  if (list === undefined) return;
  for (let i = list.length - 1; i >= 0; i--) {
    list[i]!.fn(event);
  }
}