import { describe, it, beforeEach } from 'node:test';
import { strict as assert } from 'node:assert';
import {
  ConductEvent,
  ConductEventRegister,
  ConductEventRegisterHandler,
  ConductEventUnregisterHandler,
  ConductEventEmit,
  ConductEventReset,
} from './index.ts';

class TestEvent extends ConductEvent {
  value: number;
  constructor(value: number) {
    super();
    this.value = value;
  }
}
ConductEventRegister(TestEvent);

class OtherEvent extends ConductEvent {
  label: string;
  constructor(label: string) {
    super();
    this.label = label;
  }
}
ConductEventRegister(OtherEvent);

describe('ConductEvent', () => {
  beforeEach(() => {
    ConductEventReset();
    ConductEventRegister(TestEvent);
    ConductEventRegister(OtherEvent);
  });

  it('emits to a registered handler', () => {
    const received: number[] = [];
    ConductEventRegisterHandler(TestEvent, (e: TestEvent) => received.push(e.value));
    ConductEventEmit(new TestEvent(42));
    assert.deepEqual(received, [42]);
  });

  it('emits to multiple handlers', () => {
    const received: string[] = [];
    ConductEventRegisterHandler(TestEvent, () => received.push('a'));
    ConductEventRegisterHandler(TestEvent, () => received.push('b'));
    ConductEventEmit(new TestEvent(1));
    assert.deepEqual(received, ['a', 'b']);
  });

  it('does not fire unregistered handler', () => {
    let called = false;
    const handle = ConductEventRegisterHandler(TestEvent, () => { called = true; });
    ConductEventUnregisterHandler(handle);
    ConductEventEmit(new TestEvent(1));
    assert.equal(called, false);
  });

  it('swap-and-pop unregister preserves remaining handlers', () => {
    const received: string[] = [];
    const h1 = ConductEventRegisterHandler(TestEvent, () => received.push('a'));
    ConductEventRegisterHandler(TestEvent, () => received.push('b'));
    ConductEventRegisterHandler(TestEvent, () => received.push('c'));
    ConductEventUnregisterHandler(h1);
    ConductEventEmit(new TestEvent(1));
    // 'c' swapped into h1's slot, so order is [c, b]
    assert.equal(received.length, 2);
    assert.ok(received.includes('b'));
    assert.ok(received.includes('c'));
  });

  it('defers unregister during emit', () => {
    const received: string[] = [];
    let handle: ReturnType<typeof ConductEventRegisterHandler>;
    handle = ConductEventRegisterHandler(TestEvent, () => {
      received.push('a');
      ConductEventUnregisterHandler(handle);
    });
    ConductEventRegisterHandler(TestEvent, () => received.push('b'));

    ConductEventEmit(new TestEvent(1));
    // both fire during the first emit
    assert.deepEqual(received, ['a', 'b']);

    received.length = 0;
    ConductEventEmit(new TestEvent(2));
    // 'a' was deferred-removed, only 'b' fires
    assert.deepEqual(received, ['b']);
  });

  it('does not crash when emitting with no handlers', () => {
    ConductEventEmit(new TestEvent(1));
  });

  it('does not crash when emitting an unregistered event type', () => {
    class UnregisteredEvent extends ConductEvent {}
    // typeId is never assigned, so handlers[typeId] is undefined
    ConductEventEmit(new UnregisteredEvent());
  });

  it('handles nested emit correctly', () => {
    const order: string[] = [];
    ConductEventRegisterHandler(TestEvent, (e: TestEvent) => {
      order.push(`test:${e.value}`);
      if (e.value === 1) {
        ConductEventEmit(new OtherEvent('nested'));
      }
    });
    ConductEventRegisterHandler(OtherEvent, (e: OtherEvent) => {
      order.push(`other:${e.label}`);
    });

    ConductEventEmit(new TestEvent(1));
    assert.deepEqual(order, ['test:1', 'other:nested']);
  });

  it('does not call handler registered during emit in the same emit', () => {
    const received: string[] = [];
    ConductEventRegisterHandler(TestEvent, () => {
      received.push('original');
      ConductEventRegisterHandler(TestEvent, () => received.push('new'));
    });

    ConductEventEmit(new TestEvent(1));
    assert.deepEqual(received, ['original']);

    received.length = 0;
    ConductEventEmit(new TestEvent(2));
    assert.deepEqual(received, ['original', 'new']);
  });
});