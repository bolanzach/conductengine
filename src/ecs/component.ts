import { Entity } from './entity';

export const COMPONENT_TYPE = Symbol('COMPONENT_TYPE');

export type ComponentConstructor<T extends Component = Component> = new () => T;

export abstract class Component {
  protected readonly [COMPONENT_TYPE]: ComponentConstructor = this
    .constructor as ComponentConstructor;
}

// type ComponentLookup = Map<ComponentConstructor, Array<Component | null>>;

// export class ComponentTable {
//   #table: ComponentLookup = new Map();

//   addEntityComponent<T extends Component>(entity: Entity, component: T) {
//     if (this.#table.has(component[COMPONENT_TYPE])) {
//       this.#table.set(
//         component[COMPONENT_TYPE],
//         new Array(entityList.length).fill(null)
//       );
//     }

//     this.#table.set(component[COMPONENT_TYPE], [component]);
//   }
// }
