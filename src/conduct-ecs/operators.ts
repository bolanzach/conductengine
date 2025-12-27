import { Component } from "./component";

// Marker for operator type identification at runtime
const OPERATOR_TYPE = Symbol("OPERATOR_TYPE");

/**
 * Base interface for query operators.
 */
export interface QueryOperator {
  readonly [OPERATOR_TYPE]: string;
}

/**
 * Exclude entities that have any of the specified components.
 *
 * @example
 * // Query entities with PersonComponent but NOT DeadComponent
 * Query<[PersonComponent, Not<[DeadComponent]>]>
 */
// eslint-disable-next-line @typescript-eslint/no-unused-vars
export interface Not<T extends Component[]> extends QueryOperator {
  readonly [OPERATOR_TYPE]: "Not";
}

/**
 * Include a component optionally - the component will be undefined if not present.
 *
 * @example
 * Query<[PlayerComponent, Optional<[DebugComponent]>]>
 */
// eslint-disable-next-line @typescript-eslint/no-unused-vars
export interface Optional<T extends Component[]> extends QueryOperator {
  readonly [OPERATOR_TYPE]: "Optional";
}

/**
 * A query element can be either a Component or an operator like Not/Optional.
 */
export type QueryElement = Component | QueryOperator;

/**
 * Extract only the data components (non-operators) from a query tuple.
 * This is used to determine what components are passed to the iteration callback.
 */
export type ExtractDataComponents<T extends QueryElement[]> = {
  [K in keyof T]: T[K] extends QueryOperator ? never : T[K];
}[number] extends infer U
  ? U extends never
    ? []
    : U extends Component
      ? U[]
      : []
  : [];

/**
 * Runtime representation of parsed query structure.
 * Used by the build step to communicate query structure to runtime.
 */
export type QueryNode =
  | { type: "component"; name: string }
  | { type: "not"; children: QueryNode[] }
  | { type: "optional"; children: QueryNode[] };
