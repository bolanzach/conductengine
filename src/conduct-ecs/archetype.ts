import { Component, ComponentConstructor } from "./component";
import { Entity } from "./entity";

type ComponentTable = Map<ComponentConstructor, Component[]>;

export default interface Archetype {
  componentIds: number[];
  components: ComponentTable;
  entities: Entity[];
}
