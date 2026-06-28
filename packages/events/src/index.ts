
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
let emitDepth = 0;
const pendingUnregisters: UnregisterHandler[] = [];

export function ConductEventRegister<T extends new (...any: any) => ConductEvent>(cls: T): T {
  (cls as any).typeId = nextId++;
  handlers.push([]);
  return cls;
}

export function ConductEventRegisterHandler<E extends ConductEvent>(
  type: (new (...any: any) => E) & { typeId: number },
  handler: HandlerFn
): Readonly<UnregisterHandler> {
  const list = handlers[type.typeId]!;
  const entry: Handler = { fn: handler, idx: list.length, typeId: type.typeId };
  list.push(entry);
  return entry;
}

function removeHandler(typeId: number, idx: number) {
  const list = handlers[typeId];
  if (list) {
    const last = list[list.length - 1]!;
    last.idx = idx;
    list[idx] = last;
    list.pop();
  }
}

export function ConductEventUnregisterHandler(handle: UnregisterHandler) {
  if (emitDepth > 0) {
    pendingUnregisters.push(handle);
    return;
  }
  removeHandler(handle.typeId, handle.idx);
}

export function ConductEventReset() {
  handlers.length = 0;
  nextId = 0;
  emitDepth = 0;
  pendingUnregisters.length = 0;
}

export function ConductEventEmit<E extends ConductEvent>(event: E): void {
  const list = handlers[event.typeId];
  if (list === undefined) return;
  emitDepth++;
  const len = list.length;
  for (let i = 0; i < len; i++) {
    list[i]!.fn(event);
  }
  emitDepth--;
  if (emitDepth === 0 && pendingUnregisters.length > 0) {
    for (let i = 0; i < pendingUnregisters.length; i++) {
      const pending = pendingUnregisters[i]!;
      removeHandler(pending.typeId, pending.idx);
    }
    pendingUnregisters.length = 0;
  }
}