import { ConductEvent, ConductEventRegister } from "@conduct/events";

export class CollisionEvent extends ConductEvent {
  constructor(public a: number, public b: number) {
    super();
  }
}

ConductEventRegister(CollisionEvent);
