
export abstract class ConductEvent {
  static readonly typeId: number;

  get typeId(): number {
    return (this.constructor as typeof ConductEvent).typeId;
  }
}

const handlers: Array<Array<(event: any) => void>> = [];
let nextId = 0;

export function ConductEventRegister<T extends new (...any: any) => ConductEvent>(cls: T): T {
  (cls as any).typeId = nextId++;
  handlers.push([]);
  return cls;
}

export function ConductEventConsume<E extends ConductEvent>(
  type: (new (...any: any) => E) & { typeId: number },
  callback: (event: E) => void
): void {
  handlers[type.typeId]!.push(callback);
}
