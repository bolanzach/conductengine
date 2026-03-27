export type ConductEntity = number;
export type ConductComponent = object;
export type ConductSystem = (query: Query<QueryElement[]>) => void;
export declare const ComponentId: unique symbol;
/**
 * A bit mask signature for a set of components.
 */
export type Signature = number[];
type ComponentConstructor = {
    /**
     * Unique component ID assigned at runtime.
     */
    [ComponentId]?: number;
} & (new () => ConductComponent);
declare const OPERATOR_TYPE: unique symbol;
/**
 * Base interface for query operators.
 */
interface QueryOperator {
    readonly [OPERATOR_TYPE]: string;
}
/**
 * Exclude entities that have any of the specified components.
 *
 * @example
 * // Query entities with PersonComponent but NOT DeadComponent
 * Query<[PersonComponent, Not<[DeadComponent]>]>
 */
export interface Not<T extends ConductComponent[]> extends QueryOperator {
    readonly [OPERATOR_TYPE]: "Not";
}
/**
 * Include a component optionally - the component will be undefined if not present.
 *
 * @example
 * Query<[PlayerComponent, Optional<[DebugComponent]>]>
 */
export interface Optional<T extends ConductComponent[]> extends QueryOperator {
    readonly [OPERATOR_TYPE]: "Optional";
}
export type QueryElement = ConductComponent | QueryOperator;
type SystemArgs<T extends object[]> = [ConductEntity, ...T];
/**
 * Extract only data components from a tuple that may contain operators.
 */
type FilterDataComponents<T extends QueryElement[]> = T extends [
    infer Element,
    ...infer Rest
] ? Element extends QueryOperator ? Rest extends QueryElement[] ? FilterDataComponents<Rest> : [] : Element extends object ? Rest extends QueryElement[] ? [Element, ...FilterDataComponents<Rest>] : [Element] : [] : [];
/**
 * A Query declares a set of Components to filter Entities by, and provides
 * an interface to iterate over those matching Entities and their Components.
 */
export interface Query<T extends QueryElement[]> {
    /**
     * Iterate over all matching entities and their components. The logic within
     * the `iteree` callback is executed for each matching entity. The first
     * argument is always the entity ID, followed by the requested components.
     *
     * @example
     * // Query for entities with Position and Velocity components
     * export default function MoveSystem(query: Query<[Position, Velocity]>) {
     *  query.iter(([entity, position, velocity]) => {
     *     position.x += velocity.vx;
     *     position.y += velocity.vy;
     *   });
     * }
     */
    iter: (iteree: (arg: SystemArgs<FilterDataComponents<T>>) => void) => void;
}
interface Archetype {
    signature: Signature;
    columns: Record<string, unknown[]>;
    entities: number[];
    count: number;
    capacity: number;
}
interface QueryGenerated {
    required: Signature;
    not: Signature;
    cache: Archetype[] | null;
    cacheGeneration: number;
}
/**
 * Constructs a signature from a list of component ids.
 */
export declare function createSignature(components: number[]): Signature;
export declare function createSignatureFromComponents(components: ComponentConstructor[]): Signature;
/**
 * Checks whether the `other` signature is contained within the `sig` signature.
 */
export declare function signatureContains(sig: Signature, other: Signature): boolean;
/**
 * Checks whether the two signatures are equivalent.
 */
export declare function signatureEquals(sig: Signature, other: Signature): boolean;
/**
 * Checks whether two signatures have any overlapping bits.
 * Used for Not operator matching - returns true if any component is shared.
 */
export declare function signatureOverlaps(sig: Signature, other: Signature): boolean;
export declare function ConductSpawnEntity(): number;
export declare function ConductAddComponent<T extends ComponentConstructor>(entity: ConductEntity, component: T, data?: Partial<InstanceType<T>> | ((instance: InstanceType<T>) => void)): void;
export declare function ConductRemoveComponent<T extends ComponentConstructor>(entity: ConductEntity, component: T): void;
export declare function ConductDeleteEntity(entity: ConductEntity): void;
export declare function query(q: QueryGenerated): Archetype[];
/**
 * Register a System function so that it can be executed. Systems are
 * executed in the same order they are registered. Systems must be
 * registered before starting the Conduct ECS loop.
 */
export declare function ConductRegisterSystem(system: ConductSystem): () => void;
/** Current delta time in seconds since last frame */
export declare let deltaTime: number;
/** Time of the current frame in seconds */
export declare let time: number;
/**
 * Start the main Conduct ECS loop, executing all registered systems.
 * Uses requestAnimationFrame for browser-compatible rendering.
 */
export declare function ConductStart(): void;
/**
 * Stop the main Conduct ECS loop.
 */
export declare function ConductStop(): void;
/**
 * Start the main Conduct ECS loop, executing all registered systems.
 */
export declare function ConductBenchmarkStart(iterations?: number): void;
export {};
//# sourceMappingURL=core.d.ts.map