
export abstract class ConductEvent {
  static readonly typeId: number;

  get typeId(): number {
    return (this.constructor as typeof ConductEvent).typeId;
  }
}

type Handler = { fn: (event: any) => void; idx: number };
const handlers: Array<Array<Handler>> = [];
let nextId = 0;

export function ConductEventRegister<T extends new (...any: any) => ConductEvent>(cls: T): T {
  (cls as any).typeId = nextId++;
  handlers.push([]);
  return cls;
}

export function ConductEventConsume<E extends ConductEvent>(
  type: (new (...any: any) => E) & { typeId: number },
  callback: (event: E) => void
): () => void {
  const list = handlers[type.typeId]!;
  const entry: Handler = { fn: callback, idx: list.length };
  list.push(entry);
  return () => {
    const last = list[list.length - 1]!;
    last.idx = entry.idx;
    list[entry.idx] = last;
    list.pop();
  };
}

export function ConductEventEmit<E extends ConductEvent>(event: E): void {
  const list = handlers[event.typeId];
  if (list === undefined) return;
  for (let i = list.length - 1; i >= 0; i--) {
    list[i]!.fn(event);
  }
}