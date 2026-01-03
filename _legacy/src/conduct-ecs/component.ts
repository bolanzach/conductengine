import { Entity } from "@/conduct-ecs/entity";
import { World } from "@/conduct-ecs/world";

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

export type ComponentDataConstructor<T extends ComponentConstructor> =
  | Partial<DeleteFunctions<InstanceType<T>>>
  | ((component: InstanceType<T>) => Partial<DeleteFunctions<InstanceType<T>>>);

export class ComponentAdder {
  constructor(
    public entity: Entity,
    private world: World
  ) {}

  add<T extends ComponentConstructor>(
    componentType: T,
    data: ComponentDataConstructor<T>
  ): ComponentAdder {
    this.world.addComponentToEntity(this.entity, componentType, data);
    return this;
  }
}

/**
 * Create a new component instance with data.
 */
export function component<T extends ComponentConstructor>(
  component: T,
  data: ComponentDataConstructor<T>
): InstanceType<T> {
  const instance = new component() as InstanceType<T>;
  if (typeof data === "function") {
    return Object.assign(instance, data(instance));
  }
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
