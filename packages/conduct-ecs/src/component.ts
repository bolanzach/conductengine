import { Entity } from "./entity";

export const COMPONENT_TYPE = Symbol('COMPONENT_TYPE');

export type ComponentConstructor<T extends Component = Component> = new () => T;

/**
 * A Component is struct that contains only data and no behaviors.
 */
export abstract class Component {
  // Typescript is structurally typed, so we add a protected readonly property defined as a sybmol
  // so that this class must be inherited.
  protected readonly [COMPONENT_TYPE]: ComponentConstructor = this
    .constructor as ComponentConstructor;
}

type ComponentConstructors1<T extends [Component]> = [ComponentConstructor<T[0]>];
type ComponentConstructors2<T extends [Component, Component]> = [ComponentConstructor<T[0]>, ComponentConstructor<T[1]>];
type ComponentConstructors3<T extends [Component, Component, Component]> = [ComponentConstructor<T[0]>, ComponentConstructor<T[1]>, ComponentConstructor<T[2]>];
type ComponentConstructors4<T extends [Component, Component, Component, Component]> = [ComponentConstructor<T[0]>, ComponentConstructor<T[1]>, ComponentConstructor<T[2]>, ComponentConstructor<T[3]>];

export type ComponentConstructors<T extends Component[]> =
  T[3] extends string
    ? ComponentConstructors4<[T[0], T[1], T[2], T[3]]>
    : T[2] extends string
      ? ComponentConstructors3<[T[0], T[1], T[2]]>
      : T[1] extends Component
        ? ComponentConstructors2<[T[0], T[1]]>
        : ComponentConstructors1<[T[0]]>;

type CollisionHandler<ADataType extends Component[], BDataType extends Component[]> = {
  A: ComponentConstructors<ADataType>;
  B: ComponentConstructors<BDataType>;
  Handle(a: ADataType, b: BDataType): void;
}
