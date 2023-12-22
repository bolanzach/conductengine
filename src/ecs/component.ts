export const COMPONENT_TYPE = Symbol('COMPONENT_TYPE');

export type ComponentConstructor<T extends Component = Component> = new () => T;

/**
 * A Component is struct that contains only data and no behaviors.
 */
export abstract class Component {
  // Typescript is structurally typed so we add a protected readonly property defined as a sybmol
  // so that this class must be inhertied.
  protected readonly [COMPONENT_TYPE]: ComponentConstructor = this
    .constructor as ComponentConstructor;
}
