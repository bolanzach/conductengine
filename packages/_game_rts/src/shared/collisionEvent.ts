import { ConductEvent, ConductEventRegister } from "@conduct/events";

@ConductEventRegister
export class CollisionEvent extends ConductEvent {
  constructor(public a: number, public b: number) {
    super();
  }
}
