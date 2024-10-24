import { NETWORK_ID } from "./components/network";

export const COMPONENT_TYPE = Symbol("COMPONENT_TYPE");
export const COMPONENT_ID = Symbol("COMPONENT_ID");

export type ComponentConstructor<T extends Component = Component> =
  (new () => T) & { [COMPONENT_ID]?: number };

export type ComponentType<T extends Component = Component> = (new () => T) & {
  [COMPONENT_ID]?: number;
};

/**
 * A Component is struct that contains only data and no behaviors.
 */
export abstract class Component {
  // Typescript is structurally typed, so we add a protected readonly property
  // defined as a symbol so that this class must be inherited.
  protected readonly [COMPONENT_TYPE]: ComponentConstructor = this
    .constructor as ComponentConstructor;
}

export type DeleteFields<T, U> = {
  [K in keyof T as T[K] extends U ? never : K]: T[K];
};

export type DeleteFunctions<T> = DeleteFields<T, Function>;

/**
 * Create a new component instance with data.
 */
export function component<T extends ComponentConstructor>(
  component: T,
  data: DeleteFunctions<Omit<InstanceType<T>, typeof NETWORK_ID>>
): InstanceType<T> {
  const instance = new component() as InstanceType<T>;
  return Object.assign(instance, data);
}

type ComponentConstructors1<T extends [Component]> = [
  ComponentConstructor<T[0]>,
];
type ComponentConstructors2<T extends [Component, Component]> = [
  ComponentConstructor<T[0]>,
  ComponentConstructor<T[1]>,
];
type ComponentConstructors3<T extends [Component, Component, Component]> = [
  ComponentConstructor<T[0]>,
  ComponentConstructor<T[1]>,
  ComponentConstructor<T[2]>,
];
type ComponentConstructors4<
  T extends [Component, Component, Component, Component],
> = [
  ComponentConstructor<T[0]>,
  ComponentConstructor<T[1]>,
  ComponentConstructor<T[2]>,
  ComponentConstructor<T[3]>,
];

export type ComponentConstructors<T extends Component[]> = T[3] extends string
  ? ComponentConstructors4<[T[0], T[1], T[2], T[3]]>
  : T[2] extends string
    ? ComponentConstructors3<[T[0], T[1], T[2]]>
    : T[1] extends Component
      ? ComponentConstructors2<[T[0], T[1]]>
      : ComponentConstructors1<[T[0]]>;

interface CollisionHandler<
  ADataType extends Component[],
  BDataType extends Component[],
> {
  A: ComponentConstructors<ADataType>;
  B: ComponentConstructors<BDataType>;
  Handle(a: ADataType, b: BDataType): void;
}
