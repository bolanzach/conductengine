// @ts-nocheck

import * as ts from "typescript";

/**
 * System Transformer/Compiler
 *
 * A TypeScript transformer that optimizes ECS system functions by transforming
 * ergonomic query.iter() calls into cache-friendly, unrolled loops.
 *
 * Supports multiple query parameters per system, including nested queries.
 */

const OPERATORS = ["Not", "Optional"];

console.log("ConductEngine: Compiling systems...");

// =============================================================================
// Compiler Error
// =============================================================================

class CompilerError extends Error {
  constructor(
    message: string,
    public systemName: string,
    public detail?: string
  ) {
    super(`[${systemName}] ${message}${detail ? `: ${detail}` : ""}`);
    this.name = "CompilerError";
  }
}

// =============================================================================
// Type Parsing
// =============================================================================

interface ParsedQuery {
  dataComponents: string[];
  filterComponents: { not: string[]; optional: string[] };
}

function parseTypeNode(
  node: ts.TypeNode,
  typeChecker?: ts.TypeChecker
): ParsedQuery {
  const result: ParsedQuery = {
    dataComponents: [],
    filterComponents: { not: [], optional: [] },
  };

  if (ts.isTypeReferenceNode(node)) {
    const typeName = node.typeName.getText();

    if (OPERATORS.includes(typeName)) {
      const typeArgs = node.typeArguments;
      if (typeArgs && typeArgs.length > 0) {
        const firstArg = typeArgs[0];
        if (ts.isTupleTypeNode(firstArg)) {
          firstArg.elements.forEach((element) => {
            const nested = parseTypeNode(element, typeChecker);
            if (typeName === "Not") {
              result.filterComponents.not.push(...nested.dataComponents);
            } else if (typeName === "Optional") {
              result.filterComponents.optional.push(...nested.dataComponents);
            }
          });
        }
      }
    } else {
      result.dataComponents.push(typeName);
    }
  } else if (ts.isTupleTypeNode(node)) {
    node.elements.forEach((element) => {
      const nested = parseTypeNode(element, typeChecker);
      result.dataComponents.push(...nested.dataComponents);
      result.filterComponents.not.push(...nested.filterComponents.not);
      result.filterComponents.optional.push(
        ...nested.filterComponents.optional
      );
    });
  }

  return result;
}

// =============================================================================
// System Detection
// =============================================================================

interface QueryInfo {
  paramName: string;
  queryComponents: string[];
  notComponents: string[];
  optionalComponents: string[];
}

interface SystemInfo {
  name: string;
  queries: QueryInfo[];
}

function isSystemFunction(node: ts.Node): node is ts.FunctionDeclaration {
  if (!ts.isFunctionDeclaration(node)) return false;
  if (!node.name || !node.name.text.endsWith("System")) return false;

  // Check for default export
  const hasExport =
    node.modifiers &&
    node.modifiers.some((m) => m.kind === ts.SyntaxKind.ExportKeyword);
  const hasDefault =
    node.modifiers &&
    node.modifiers.some((m) => m.kind === ts.SyntaxKind.DefaultKeyword);

  return !!(hasExport && hasDefault);
}

function extractSystemInfo(func: ts.FunctionDeclaration): SystemInfo | null {
  const queries: QueryInfo[] = [];

  for (const param of func.parameters) {
    if (param.type && ts.isTypeReferenceNode(param.type)) {
      const typeName = param.type.typeName.getText();
      const typeArgs = param.type.typeArguments;

      if (typeName === "Query" && typeArgs && typeArgs.length > 0) {
        const typeArg = typeArgs[0];
        const parsed = parseTypeNode(typeArg);

        queries.push({
          paramName: (param.name as ts.Identifier).text,
          queryComponents: parsed.dataComponents,
          notComponents: parsed.filterComponents.not,
          optionalComponents: parsed.filterComponents.optional,
        });
      }
    }
  }

  if (queries.length === 0) return null;
  return { name: func.name!.text, queries };
}

// =============================================================================
// Callback Extraction
// =============================================================================

interface CallbackInfo {
  paramNames: string[];
  body: ts.Block | ts.Expression;
}

function extractCallbackInfo(call: ts.CallExpression, callbackArgIndex: number = 0): CallbackInfo | null {
  const callback = call.arguments[callbackArgIndex];

  if (
    !callback ||
    (!ts.isArrowFunction(callback) && !ts.isFunctionExpression(callback))
  ) {
    return null;
  }

  const firstParam = callback.parameters[0];
  if (!firstParam || !ts.isArrayBindingPattern(firstParam.name)) {
    return null;
  }

  const paramNames = firstParam.name.elements
    .filter((el): el is ts.BindingElement => ts.isBindingElement(el))
    .map((el) => (el.name as ts.Identifier).text);

  return {
    paramNames,
    body: callback.body,
  };
}

// =============================================================================
// Parameter Mapping
// =============================================================================

interface ParamMapping {
  componentType: string | null; // null = entity
  queryIndex: number;
}

// =============================================================================
// Validation
// =============================================================================

function validateNoComponentPassing(
  body: ts.Node,
  paramToComponent: Map<string, ParamMapping>,
  systemName: string
): void {
  function visit(node: ts.Node) {
    if (ts.isCallExpression(node)) {
      node.arguments.forEach((arg) => {
        if (ts.isIdentifier(arg)) {
          const paramName = arg.text;
          const mapping = paramToComponent.get(paramName);

          if (mapping !== undefined && mapping.componentType !== null) {
            throw new CompilerError(
              "Cannot pass entire component to function",
              systemName,
              `'${paramName}' (${mapping.componentType}) passed to function call. ` +
                `Pass individual properties instead, e.g., '${paramName}.x, ${paramName}.y'`
            );
          }
        }
      });
    }
    // Check for destructuring: const { x } = component or const { x } = component as T
    if (ts.isVariableStatement(node)) {
      for (const decl of node.declarationList.declarations) {
        if (ts.isObjectBindingPattern(decl.name) && decl.initializer) {
          let init = decl.initializer;
          // Unwrap `as` expressions: const { x } = component as Foo
          if (ts.isAsExpression(init)) init = init.expression;
          if (ts.isIdentifier(init)) {
            const paramName = init.text;
            const mapping = paramToComponent.get(paramName);
            if (mapping !== undefined && mapping.componentType !== null) {
              throw new CompilerError(
                "Cannot destructure component parameter",
                systemName,
                `'${paramName}' (${mapping.componentType}) used in destructuring assignment. ` +
                  `Use direct property access instead, e.g., 'const x = ${paramName}.x'`
              );
            }
          }
        }
      }
    }

    ts.forEachChild(node, visit);
  }
  visit(body);
}

// =============================================================================
// AST Transformation Helpers
// =============================================================================

function createQueryConstant(
  systemName: string,
  queryIndex: number,
  queryInfo: QueryInfo,
  factory: ts.NodeFactory
): ts.VariableStatement {
  const queryName = `__query_${systemName}_${queryIndex}`;

  const componentRefs = queryInfo.queryComponents.map((c) =>
    factory.createIdentifier(c)
  );

  const requiredSignature = factory.createCallExpression(
    factory.createIdentifier("createSignatureFromComponents"),
    undefined,
    [factory.createArrayLiteralExpression(componentRefs)]
  );

  let notSignature: ts.Expression;
  if (queryInfo.notComponents.length > 0) {
    const notRefs = queryInfo.notComponents.map((c) =>
      factory.createIdentifier(c)
    );
    notSignature = factory.createCallExpression(
      factory.createIdentifier("createSignatureFromComponents"),
      undefined,
      [factory.createArrayLiteralExpression(notRefs)]
    );
  } else {
    notSignature = factory.createArrayLiteralExpression([]);
  }

  const queryObject = factory.createObjectLiteralExpression([
    factory.createPropertyAssignment("required", requiredSignature),
    factory.createPropertyAssignment("not", notSignature),
    factory.createPropertyAssignment("cache", factory.createNull()),
    factory.createPropertyAssignment(
      "cacheGeneration",
      factory.createNumericLiteral(0)
    ),
  ]);

  return factory.createVariableStatement(
    undefined,
    factory.createVariableDeclarationList(
      [
        factory.createVariableDeclaration(
          queryName,
          undefined,
          undefined,
          queryObject
        ),
      ],
      ts.NodeFlags.Const
    )
  );
}

/**
 * Transform the callback body: replace component property accesses with
 * array indexing, entity identifiers with archetype entity access, and
 * return statements with labeled continue.
 *
 * Skips nested iter calls on query params — those are handled recursively
 * by processStatements.
 */
function transformCallbackBody(
  body: ts.Node,
  paramToComponent: Map<string, ParamMapping>,
  optionalParams: Set<string>,
  sharedColumnRefs: Map<number, Set<string>>,
  context: ts.TransformationContext,
  entityLoopLabel: string,
  queryParamNames: Set<string>,
  queryIndex: number,
  useBreak: boolean = false,
): ts.Node {
  const factory = context.factory;

  function addColumnRef(qi: number, key: string) {
    let refs = sharedColumnRefs.get(qi);
    if (!refs) {
      refs = new Set();
      sharedColumnRefs.set(qi, refs);
    }
    refs.add(key);
  }

  // Track nesting depth to avoid transforming returns inside nested functions
  let functionNestingDepth = 0;

  function visit(node: ts.Node): ts.Node {
    // Handle query method calls on query params
    if (
      ts.isCallExpression(node) &&
      ts.isPropertyAccessExpression(node.expression)
    ) {
      const methodName = node.expression.name.text;
      const obj = node.expression.expression;
      if (
        (methodName === "iter" || methodName === "get" || methodName === "has") &&
        ts.isIdentifier(obj) &&
        queryParamNames.has(obj.text)
      ) {
        // iter: skip entirely — processStatements handles it
        if (methodName === "iter") {
          return node;
        }
        // get/has: transform the entity argument (arg 0) but skip the callback (arg 1 for get)
        const transformedArgs = node.arguments.map((arg, idx) => {
          if (methodName === "get" && idx === 1) return arg;
          return ts.visitNode(arg, visit) as ts.Expression;
        });
        return factory.updateCallExpression(node, node.expression, node.typeArguments, transformedArgs);
      }
    }

    // Track entering/exiting nested functions
    if (ts.isArrowFunction(node) || ts.isFunctionExpression(node) || ts.isFunctionDeclaration(node)) {
      functionNestingDepth++;
      const result = ts.visitEachChild(node, visit, context);
      functionNestingDepth--;
      return result;
    }

    // Transform return statements to labeled break/continue (only at callback level)
    if (ts.isReturnStatement(node) && functionNestingDepth === 0) {
      if (useBreak) {
        return factory.createBreakStatement(factory.createIdentifier(entityLoopLabel));
      }
      return factory.createContinueStatement(factory.createIdentifier(entityLoopLabel));
    }

    // Transform property access: pos.x -> Position_x_N[$__conduct_engine_c_N]
    if (ts.isPropertyAccessExpression(node)) {
      const obj = node.expression;
      const prop = node.name.text;

      if (ts.isIdentifier(obj)) {
        const paramName = obj.text;
        const mapping = paramToComponent.get(paramName);

        if (mapping !== undefined && mapping.componentType !== null) {
          const columnKey = `${mapping.componentType}.${prop}`;
          addColumnRef(mapping.queryIndex, columnKey);

          const qi = mapping.queryIndex;
          const localVarName = `${mapping.componentType}_${prop}_${qi}`;
          return factory.createElementAccessExpression(
            factory.createIdentifier(localVarName),
            factory.createIdentifier(`$__conduct_engine_c_${qi}`)
          );
        }
      }
    }

    // Transform standalone identifiers
    if (ts.isIdentifier(node)) {
      const paramName = node.text;
      const mapping = paramToComponent.get(paramName);

      if (mapping !== undefined) {
        const parent = node.parent;
        const isPropertyAccessObject =
          parent &&
          ts.isPropertyAccessExpression(parent) &&
          parent.expression === node;

        // Entity identifier: entity -> $__conduct_engine_arch_N.entities[$__conduct_engine_c_N]
        if (mapping.componentType === null) {
          if (isPropertyAccessObject) return node;
          const qi = mapping.queryIndex;
          return factory.createElementAccessExpression(
            factory.createPropertyAccessExpression(
              factory.createIdentifier(`$__conduct_engine_arch_${qi}`),
              "entities"
            ),
            factory.createIdentifier(`$__conduct_engine_c_${qi}`)
          );
        }

        // Optional component presence check
        if (optionalParams.has(paramName)) {
          if (isPropertyAccessObject) return node;
          return factory.createIdentifier(`$__conduct_engine_opt_${mapping.componentType}_${mapping.queryIndex}`);
        }
      }
    }

    return ts.visitEachChild(node, visit, context);
  }

  return ts.visitNode(body, visit) as ts.Node;
}

/**
 * Search a statement for a `paramName.iter()` call where paramName
 * is one of the known query parameters.
 */
function findIterCallInStatement(
  stmt: ts.Statement,
  queryParamNames: Set<string>
): { paramName: string; iterCall: ts.CallExpression } | null {
  let result: { paramName: string; iterCall: ts.CallExpression } | null = null;

  function search(node: ts.Node) {
    if (result) return;
    if (
      ts.isCallExpression(node) &&
      ts.isPropertyAccessExpression(node.expression) &&
      node.expression.name.text === "iter"
    ) {
      const obj = node.expression.expression;
      if (ts.isIdentifier(obj) && queryParamNames.has(obj.text)) {
        result = { paramName: obj.text, iterCall: node };
        return;
      }
    }
    ts.forEachChild(node, search);
  }

  search(stmt);
  return result;
}

/**
 * Search a statement for a `paramName.get()` call where paramName
 * is one of the known query parameters.
 */
function findGetCallInStatement(
  stmt: ts.Statement,
  queryParamNames: Set<string>
): { paramName: string; getCall: ts.CallExpression } | null {
  let result: { paramName: string; getCall: ts.CallExpression } | null = null;

  function search(node: ts.Node) {
    if (result) return;
    if (
      ts.isCallExpression(node) &&
      ts.isPropertyAccessExpression(node.expression) &&
      node.expression.name.text === "get"
    ) {
      const obj = node.expression.expression;
      if (ts.isIdentifier(obj) && queryParamNames.has(obj.text)) {
        result = { paramName: obj.text, getCall: node };
        return;
      }
    }
    ts.forEachChild(node, search);
  }

  search(stmt);
  return result;
}

/**
 * Search a statement for a `paramName.has()` call where paramName
 * is one of the known query parameters.
 */
function findHasCallInStatement(
  stmt: ts.Statement,
  queryParamNames: Set<string>
): { paramName: string; hasCall: ts.CallExpression } | null {
  let result: { paramName: string; hasCall: ts.CallExpression } | null = null;

  function search(node: ts.Node) {
    if (result) return;
    if (
      ts.isCallExpression(node) &&
      ts.isPropertyAccessExpression(node.expression) &&
      node.expression.name.text === "has"
    ) {
      const obj = node.expression.expression;
      if (ts.isIdentifier(obj) && queryParamNames.has(obj.text)) {
        result = { paramName: obj.text, hasCall: node };
        return;
      }
    }
    ts.forEachChild(node, search);
  }

  search(stmt);
  return result;
}

/**
 * Replace a specific call expression within a statement with a replacement expression.
 * Used to swap query.get()/query.has() calls with their result variables.
 */
function replaceCallExprInStatement(
  stmt: ts.Statement,
  targetCall: ts.CallExpression,
  replacementExpr: ts.Expression,
  context: ts.TransformationContext,
): ts.Statement {
  function visit(node: ts.Node): ts.Node {
    if (node === targetCall) {
      return replacementExpr;
    }
    return ts.visitEachChild(node, visit, context);
  }
  return ts.visitNode(stmt, visit) as ts.Statement;
}

/**
 * Build column key constants and per-query column extraction statements.
 * Shared by buildLoopStructure and buildGetStructure.
 */
function buildColumnExtractions(
  qi: number,
  queryInfo: QueryInfo,
  columnRefs: Set<string>,
  componentCounters: Map<string, number>,
  factory: ts.NodeFactory,
  generatedColumnKeys: Set<string>,
  allColumnKeyConstants: ts.VariableStatement[],
): {
  columnExtractions: ts.VariableStatement[];
  optionalPresenceChecks: ts.VariableStatement[];
} {
  const optionalComponentNames = new Set(queryInfo.optionalComponents);
  const columnExtractions: ts.VariableStatement[] = [];

  for (const colKey of columnRefs) {
    const [componentName, propName] = colKey.split(".");
    const componentCounter = componentCounters.get(componentName)!;
    const isOptional = optionalComponentNames.has(componentName);

    const columnKeyVarName = `$__conduct_engine_${componentName}${componentCounter}_${propName}`;

    // Only generate the column key constant once (shared across queries)
    if (!generatedColumnKeys.has(columnKeyVarName)) {
      generatedColumnKeys.add(columnKeyVarName);
      const columnKeyExpr = factory.createBinaryExpression(
        factory.createElementAccessExpression(
          factory.createIdentifier(componentName),
          factory.createIdentifier("ComponentId")
        ),
        ts.SyntaxKind.PlusToken,
        factory.createStringLiteral(`.${propName}`)
      );
      allColumnKeyConstants.push(
        factory.createVariableStatement(
          undefined,
          factory.createVariableDeclarationList(
            [factory.createVariableDeclaration(columnKeyVarName, undefined, undefined, columnKeyExpr)],
            ts.NodeFlags.Const
          )
        )
      );
    }

    // Per-query column extraction: const Component_prop_N = columns_N[keyVar]
    const localVarName = `${colKey.replace(".", "_")}_${qi}`;
    const columnAccess = factory.createElementAccessExpression(
      factory.createIdentifier(`$__conduct_engine_columns_${qi}`),
      factory.createIdentifier(columnKeyVarName)
    );

    columnExtractions.push(
      factory.createVariableStatement(
        undefined,
        factory.createVariableDeclarationList(
          [
            factory.createVariableDeclaration(
              localVarName,
              undefined,
              undefined,
              isOptional
                ? factory.createBinaryExpression(
                    columnAccess,
                    ts.SyntaxKind.QuestionQuestionToken,
                    factory.createIdentifier("$__conduct_engine_undef")
                  )
                : columnAccess
            ),
          ],
          ts.NodeFlags.Const
        )
      )
    );
  }

  // Optional presence checks
  const optionalPresenceChecks: ts.VariableStatement[] = [];
  for (const optComp of queryInfo.optionalComponents) {
    const componentCounter = componentCounters.get(optComp)!;
    optionalPresenceChecks.push(
      factory.createVariableStatement(
        undefined,
        factory.createVariableDeclarationList(
          [
            factory.createVariableDeclaration(
              `$__conduct_engine_opt_${optComp}_${qi}`,
              undefined,
              undefined,
              factory.createCallExpression(
                factory.createIdentifier("signatureContains"),
                undefined,
                [
                  factory.createPropertyAccessExpression(
                    factory.createIdentifier(`$__conduct_engine_arch_${qi}`),
                    "signature"
                  ),
                  factory.createIdentifier(
                    `$__conduct_engine_opt_sig_${optComp}${componentCounter}`
                  ),
                ]
              )
            ),
          ],
          ts.NodeFlags.Const
        )
      )
    );
  }

  return { columnExtractions, optionalPresenceChecks };
}

/**
 * Build a columns declaration: const $__conduct_engine_columns_N = $__conduct_engine_arch_N.columns;
 */
function buildColumnsDecl(qi: number, factory: ts.NodeFactory): ts.VariableStatement {
  return factory.createVariableStatement(
    undefined,
    factory.createVariableDeclarationList(
      [
        factory.createVariableDeclaration(
          `$__conduct_engine_columns_${qi}`,
          undefined,
          undefined,
          factory.createPropertyAccessExpression(
            factory.createIdentifier(`$__conduct_engine_arch_${qi}`),
            "columns"
          )
        ),
      ],
      ts.NodeFlags.Const
    )
  );
}

/**
 * Build the signature match condition for get/has:
 * signatureContains(arch.signature, query.required) && (not check if needed)
 */
function buildSignatureMatchCondition(
  qi: number,
  systemName: string,
  hasNotComponents: boolean,
  factory: ts.NodeFactory,
): ts.Expression {
  const queryName = `__query_${systemName}_${qi}`;
  const archVarName = `$__conduct_engine_arch_${qi}`;

  let condition: ts.Expression = factory.createCallExpression(
    factory.createIdentifier("signatureContains"),
    undefined,
    [
      factory.createPropertyAccessExpression(
        factory.createIdentifier(archVarName),
        "signature"
      ),
      factory.createPropertyAccessExpression(
        factory.createIdentifier(queryName),
        "required"
      ),
    ]
  );

  if (hasNotComponents) {
    condition = factory.createBinaryExpression(
      condition,
      ts.SyntaxKind.AmpersandAmpersandToken,
      factory.createPrefixUnaryExpression(
        ts.SyntaxKind.ExclamationToken,
        factory.createCallExpression(
          factory.createIdentifier("signatureOverlaps"),
          undefined,
          [
            factory.createPropertyAccessExpression(
              factory.createIdentifier(archVarName),
              "signature"
            ),
            factory.createPropertyAccessExpression(
              factory.createIdentifier(queryName),
              "not"
            ),
          ]
        )
      )
    );
  }

  return condition;
}

/**
 * Build the nested loop structure for a single query iteration.
 */
function buildLoopStructure(
  queryIndex: number,
  systemName: string,
  queryInfo: QueryInfo,
  bodyStatements: ts.Statement[],
  componentCounters: Map<string, number>,
  columnRefs: Set<string>,
  factory: ts.NodeFactory,
  // Side-effect collectors
  generatedColumnKeys: Set<string>,
  allColumnKeyConstants: ts.VariableStatement[],
): ts.Statement[] {
  const qi = queryIndex;
  const queryName = `__query_${systemName}_${qi}`;
  const entityLoopLabel = `$__conduct_engine_entity_label_${qi}`;

  const { columnExtractions, optionalPresenceChecks } = buildColumnExtractions(
    qi, queryInfo, columnRefs, componentCounters, factory, generatedColumnKeys, allColumnKeyConstants,
  );

  // const $__conduct_engine_count_N = $__conduct_engine_arch_N.count;
  const countDecl = factory.createVariableStatement(
    undefined,
    factory.createVariableDeclarationList(
      [
        factory.createVariableDeclaration(
          `$__conduct_engine_count_${qi}`,
          undefined,
          undefined,
          factory.createPropertyAccessExpression(
            factory.createIdentifier(`$__conduct_engine_arch_${qi}`),
            "count"
          )
        ),
      ],
      ts.NodeFlags.Const
    )
  );

  // Inner loop: entity iteration
  const innerLoop = factory.createLabeledStatement(
    factory.createIdentifier(entityLoopLabel),
    factory.createForStatement(
      factory.createVariableDeclarationList(
        [
          factory.createVariableDeclaration(
            `$__conduct_engine_c_${qi}`,
            undefined,
            undefined,
            factory.createNumericLiteral(0)
          ),
        ],
        ts.NodeFlags.Let
      ),
      factory.createBinaryExpression(
        factory.createIdentifier(`$__conduct_engine_c_${qi}`),
        ts.SyntaxKind.LessThanToken,
        factory.createIdentifier(`$__conduct_engine_count_${qi}`)
      ),
      factory.createPostfixIncrement(factory.createIdentifier(`$__conduct_engine_c_${qi}`)),
      factory.createBlock(bodyStatements, true)
    )
  );

  const columnsDecl = buildColumnsDecl(qi, factory);

  // Outer loop: archetype iteration
  const outerLoop = factory.createForStatement(
    factory.createVariableDeclarationList(
      [
        factory.createVariableDeclaration(
          `$__conduct_engine_i_${qi}`,
          undefined,
          undefined,
          factory.createNumericLiteral(0)
        ),
      ],
      ts.NodeFlags.Let
    ),
    factory.createBinaryExpression(
      factory.createIdentifier(`$__conduct_engine_i_${qi}`),
      ts.SyntaxKind.LessThanToken,
      factory.createPropertyAccessExpression(
        factory.createIdentifier(`$__conduct_engine_matches_${qi}`),
        "length"
      )
    ),
    factory.createPostfixIncrement(factory.createIdentifier(`$__conduct_engine_i_${qi}`)),
    factory.createBlock(
      [
        factory.createVariableStatement(
          undefined,
          factory.createVariableDeclarationList(
            [
              factory.createVariableDeclaration(
                `$__conduct_engine_arch_${qi}`,
                undefined,
                undefined,
                factory.createElementAccessExpression(
                  factory.createIdentifier(`$__conduct_engine_matches_${qi}`),
                  factory.createIdentifier(`$__conduct_engine_i_${qi}`)
                )
              ),
            ],
            ts.NodeFlags.Const
          )
        ),
        columnsDecl,
        ...optionalPresenceChecks,
        ...columnExtractions,
        countDecl,
        innerLoop,
      ],
      true
    )
  );

  // const $__conduct_engine_matches_N = query(__query_SystemName_N);
  const matchesDecl = factory.createVariableStatement(
    undefined,
    factory.createVariableDeclarationList(
      [
        factory.createVariableDeclaration(
          `$__conduct_engine_matches_${qi}`,
          undefined,
          undefined,
          factory.createCallExpression(
            factory.createIdentifier("query"),
            undefined,
            [factory.createIdentifier(queryName)]
          )
        ),
      ],
      ts.NodeFlags.Const
    )
  );

  return [matchesDecl, outerLoop];
}

/**
 * Build the point-lookup structure for a single query.get() call.
 */
function buildGetStructure(
  queryIndex: number,
  systemName: string,
  queryInfo: QueryInfo,
  entityExpr: ts.Expression,
  bodyStatements: ts.Statement[],
  componentCounters: Map<string, number>,
  columnRefs: Set<string>,
  factory: ts.NodeFactory,
  generatedColumnKeys: Set<string>,
  allColumnKeyConstants: ts.VariableStatement[],
): { preStatements: ts.Statement[]; resultVarName: string } {
  const qi = queryIndex;
  const entityLoopLabel = `$__conduct_engine_entity_label_${qi}`;
  const resultVarName = `$__conduct_engine_get_result_${qi}`;
  const locVarName = `$__conduct_engine_loc_${qi}`;
  const archVarName = `$__conduct_engine_arch_${qi}`;

  const { columnExtractions, optionalPresenceChecks } = buildColumnExtractions(
    qi, queryInfo, columnRefs, componentCounters, factory, generatedColumnKeys, allColumnKeyConstants,
  );

  const matchCondition = buildSignatureMatchCondition(
    qi, systemName, queryInfo.notComponents.length > 0, factory,
  );

  const columnsDecl = buildColumnsDecl(qi, factory);

  // const $__conduct_engine_c_N = $loc.row;
  const rowDecl = factory.createVariableStatement(
    undefined,
    factory.createVariableDeclarationList(
      [
        factory.createVariableDeclaration(
          `$__conduct_engine_c_${qi}`,
          undefined,
          undefined,
          factory.createPropertyAccessExpression(
            factory.createIdentifier(locVarName),
            "row"
          )
        ),
      ],
      ts.NodeFlags.Const
    )
  );

  // Labeled block for break support (early return in get callback)
  const labeledBlock = factory.createLabeledStatement(
    factory.createIdentifier(entityLoopLabel),
    factory.createBlock(bodyStatements, true)
  );

  // Inner if: signature matches -> set result, extract columns, run body
  const innerIf = factory.createIfStatement(
    matchCondition,
    factory.createBlock([
      factory.createExpressionStatement(
        factory.createBinaryExpression(
          factory.createIdentifier(resultVarName),
          ts.SyntaxKind.EqualsToken,
          factory.createTrue()
        )
      ),
      rowDecl,
      columnsDecl,
      ...optionalPresenceChecks,
      ...columnExtractions,
      labeledBlock,
    ], true)
  );

  // Outer if: entity location exists
  const outerIf = factory.createIfStatement(
    factory.createBinaryExpression(
      factory.createIdentifier(locVarName),
      ts.SyntaxKind.ExclamationEqualsEqualsToken,
      factory.createIdentifier("undefined")
    ),
    factory.createBlock([
      // const $arch = archetypes[$loc.archetypeIndex];
      factory.createVariableStatement(
        undefined,
        factory.createVariableDeclarationList(
          [
            factory.createVariableDeclaration(
              archVarName,
              undefined,
              undefined,
              factory.createElementAccessExpression(
                factory.createIdentifier("archetypes"),
                factory.createPropertyAccessExpression(
                  factory.createIdentifier(locVarName),
                  "archetypeIndex"
                )
              )
            ),
          ],
          ts.NodeFlags.Const
        )
      ),
      innerIf,
    ], true)
  );

  const preStatements: ts.Statement[] = [
    // let $result = false;
    factory.createVariableStatement(
      undefined,
      factory.createVariableDeclarationList(
        [factory.createVariableDeclaration(resultVarName, undefined, undefined, factory.createFalse())],
        ts.NodeFlags.Let
      )
    ),
    // const $loc = entityLocations[entityExpr];
    factory.createVariableStatement(
      undefined,
      factory.createVariableDeclarationList(
        [
          factory.createVariableDeclaration(
            locVarName,
            undefined,
            undefined,
            factory.createElementAccessExpression(
              factory.createIdentifier("entityLocations"),
              entityExpr
            )
          ),
        ],
        ts.NodeFlags.Const
      )
    ),
    outerIf,
  ];

  return { preStatements, resultVarName };
}

/**
 * Build the boolean check structure for a single query.has() call.
 */
function buildHasStructure(
  queryIndex: number,
  systemName: string,
  queryInfo: QueryInfo,
  entityExpr: ts.Expression,
  factory: ts.NodeFactory,
): { preStatements: ts.Statement[]; resultVarName: string } {
  const qi = queryIndex;
  const resultVarName = `$__conduct_engine_has_result_${qi}`;
  const locVarName = `$__conduct_engine_loc_${qi}`;
  const archVarName = `$__conduct_engine_arch_${qi}`;

  const matchCondition = buildSignatureMatchCondition(
    qi, systemName, queryInfo.notComponents.length > 0, factory,
  );

  // Outer if: entity location exists
  const outerIf = factory.createIfStatement(
    factory.createBinaryExpression(
      factory.createIdentifier(locVarName),
      ts.SyntaxKind.ExclamationEqualsEqualsToken,
      factory.createIdentifier("undefined")
    ),
    factory.createBlock([
      // const $arch = archetypes[$loc.archetypeIndex];
      factory.createVariableStatement(
        undefined,
        factory.createVariableDeclarationList(
          [
            factory.createVariableDeclaration(
              archVarName,
              undefined,
              undefined,
              factory.createElementAccessExpression(
                factory.createIdentifier("archetypes"),
                factory.createPropertyAccessExpression(
                  factory.createIdentifier(locVarName),
                  "archetypeIndex"
                )
              )
            ),
          ],
          ts.NodeFlags.Const
        )
      ),
      // $result = signatureContains(...) && ...;
      factory.createExpressionStatement(
        factory.createBinaryExpression(
          factory.createIdentifier(resultVarName),
          ts.SyntaxKind.EqualsToken,
          matchCondition
        )
      ),
    ], true)
  );

  const preStatements: ts.Statement[] = [
    // let $result = false;
    factory.createVariableStatement(
      undefined,
      factory.createVariableDeclarationList(
        [factory.createVariableDeclaration(resultVarName, undefined, undefined, factory.createFalse())],
        ts.NodeFlags.Let
      )
    ),
    // const $loc = entityLocations[entityExpr];
    factory.createVariableStatement(
      undefined,
      factory.createVariableDeclarationList(
        [
          factory.createVariableDeclaration(
            locVarName,
            undefined,
            undefined,
            factory.createElementAccessExpression(
              factory.createIdentifier("entityLocations"),
              entityExpr
            )
          ),
        ],
        ts.NodeFlags.Const
      )
    ),
    outerIf,
  ];

  return { preStatements, resultVarName };
}

/**
 * Register components for a query and assign counters. Generates optional
 * signature constants when needed. Shared by iter/get/has processing.
 */
function registerQueryComponents(
  queryInfo: QueryInfo,
  componentCounters: Map<string, number>,
  nextComponentCounter: { value: number },
  usedComponents: Set<string>,
  factory: ts.NodeFactory,
  optSignatureConstants: ts.VariableStatement[],
  generatedOptSigs: Set<string>,
  needsOptionalSupport: { value: boolean },
): void {
  const allComps = [...queryInfo.queryComponents, ...queryInfo.notComponents, ...queryInfo.optionalComponents];
  for (const comp of allComps) {
    usedComponents.add(comp);
    if (!componentCounters.has(comp)) {
      componentCounters.set(comp, nextComponentCounter.value++);
    }
  }

  if (queryInfo.optionalComponents.length > 0) {
    needsOptionalSupport.value = true;
    for (const comp of queryInfo.optionalComponents) {
      const counter = componentCounters.get(comp)!;
      const sigName = `$__conduct_engine_opt_sig_${comp}${counter}`;
      if (!generatedOptSigs.has(sigName)) {
        generatedOptSigs.add(sigName);
        optSignatureConstants.push(
          factory.createVariableStatement(
            undefined,
            factory.createVariableDeclarationList(
              [
                factory.createVariableDeclaration(
                  sigName,
                  undefined,
                  undefined,
                  factory.createCallExpression(
                    factory.createIdentifier("createSignatureFromComponents"),
                    undefined,
                    [factory.createArrayLiteralExpression([factory.createIdentifier(comp)])]
                  )
                ),
              ],
              ts.NodeFlags.Const
            )
          )
        );
      }
    }
  }
}

/**
 * Transform a callback body, extract statements, and recursively process for nested queries.
 * Shared by iter and get processing.
 */
function transformAndProcessCallbackBody(
  callbackInfo: CallbackInfo,
  mergedMappings: Map<string, ParamMapping>,
  mergedOptionalParams: Set<string>,
  queryParamNames: Set<string>,
  qi: number,
  useBreak: boolean,
  sharedColumnRefs: Map<number, Set<string>>,
  // Pass-through args for recursive processStatements
  processStatementsArgs: {
    queryInfoMap: Map<string, QueryInfo>;
    systemName: string;
    factory: ts.NodeFactory;
    context: ts.TransformationContext;
    componentCounters: Map<string, number>;
    nextComponentCounter: { value: number };
    queryCounter: { value: number };
    queryConstants: ts.VariableStatement[];
    allColumnKeyConstants: ts.VariableStatement[];
    optSignatureConstants: ts.VariableStatement[];
    usedComponents: Set<string>;
    generatedColumnKeys: Set<string>;
    generatedOptSigs: Set<string>;
    needsOptionalSupport: { value: boolean };
    needsEntityLookup: { value: boolean };
    needsSignatureOverlaps: { value: boolean };
  },
): ts.Statement[] {
  const { systemName, context, factory } = processStatementsArgs;

  validateNoComponentPassing(callbackInfo.body, mergedMappings, systemName);

  const entityLoopLabel = `$__conduct_engine_entity_label_${qi}`;

  const transformedBody = transformCallbackBody(
    callbackInfo.body,
    mergedMappings,
    mergedOptionalParams,
    sharedColumnRefs,
    context,
    entityLoopLabel,
    queryParamNames,
    qi,
    useBreak,
  );

  let bodyStatements: ts.Statement[];
  if (ts.isBlock(transformedBody)) {
    bodyStatements = Array.from(transformedBody.statements);
  } else {
    bodyStatements = [
      factory.createExpressionStatement(transformedBody as ts.Expression),
    ];
  }

  // Recursively process body statements for nested query calls
  bodyStatements = processStatements(
    bodyStatements,
    queryParamNames,
    processStatementsArgs.queryInfoMap,
    mergedMappings,
    mergedOptionalParams,
    systemName,
    factory,
    context,
    processStatementsArgs.componentCounters,
    processStatementsArgs.nextComponentCounter,
    processStatementsArgs.queryCounter,
    processStatementsArgs.queryConstants,
    processStatementsArgs.allColumnKeyConstants,
    processStatementsArgs.optSignatureConstants,
    processStatementsArgs.usedComponents,
    processStatementsArgs.generatedColumnKeys,
    processStatementsArgs.generatedOptSigs,
    processStatementsArgs.needsOptionalSupport,
    processStatementsArgs.needsEntityLookup,
    processStatementsArgs.needsSignatureOverlaps,
    sharedColumnRefs,
  );

  return bodyStatements;
}

/**
 * Recursively process a list of statements, replacing iter/get/has calls with
 * optimized structures. Handles nested queries naturally.
 */
function processStatements(
  statements: ts.Statement[],
  queryParamNames: Set<string>,
  queryInfoMap: Map<string, QueryInfo>,
  activeMappings: Map<string, ParamMapping>,
  activeOptionalParams: Set<string>,
  systemName: string,
  factory: ts.NodeFactory,
  context: ts.TransformationContext,
  componentCounters: Map<string, number>,
  nextComponentCounter: { value: number },
  queryCounter: { value: number },
  // Side-effect collectors
  queryConstants: ts.VariableStatement[],
  allColumnKeyConstants: ts.VariableStatement[],
  optSignatureConstants: ts.VariableStatement[],
  usedComponents: Set<string>,
  generatedColumnKeys: Set<string>,
  generatedOptSigs: Set<string>,
  needsOptionalSupport: { value: boolean },
  needsEntityLookup: { value: boolean },
  needsSignatureOverlaps: { value: boolean },
  sharedColumnRefs: Map<number, Set<string>>,
): ts.Statement[] {
  const result: ts.Statement[] = [];

  const processArgs = {
    queryInfoMap, systemName, factory, context,
    componentCounters, nextComponentCounter, queryCounter,
    queryConstants, allColumnKeyConstants, optSignatureConstants,
    usedComponents, generatedColumnKeys, generatedOptSigs,
    needsOptionalSupport, needsEntityLookup, needsSignatureOverlaps,
  };

  for (let si = 0; si < statements.length; si++) {
    const stmt = statements[si];

    // --- iter ---
    const iterInfo = findIterCallInStatement(stmt, queryParamNames);
    if (iterInfo) {
      const queryInfo = queryInfoMap.get(iterInfo.paramName)!;
      const callbackInfo = extractCallbackInfo(iterInfo.iterCall);
      if (!callbackInfo) {
        result.push(stmt);
        continue;
      }

      const qi = queryCounter.value++;

      registerQueryComponents(
        queryInfo, componentCounters, nextComponentCounter, usedComponents,
        factory, optSignatureConstants, generatedOptSigs, needsOptionalSupport,
      );

      queryConstants.push(createQueryConstant(systemName, qi, queryInfo, factory));

      // Build merged param-to-component mapping (entity at index 0)
      const mergedMappings = new Map(activeMappings);
      const mergedOptionalParams = new Set(activeOptionalParams);

      mergedMappings.set(callbackInfo.paramNames[0], { componentType: null, queryIndex: qi });
      for (let i = 0; i < queryInfo.queryComponents.length; i++) {
        mergedMappings.set(
          callbackInfo.paramNames[i + 1],
          { componentType: queryInfo.queryComponents[i], queryIndex: qi }
        );
      }
      for (let i = 0; i < queryInfo.optionalComponents.length; i++) {
        const paramIndex = 1 + queryInfo.queryComponents.length + i;
        const paramName = callbackInfo.paramNames[paramIndex];
        mergedMappings.set(paramName, { componentType: queryInfo.optionalComponents[i], queryIndex: qi });
        mergedOptionalParams.add(paramName);
      }

      const bodyStatements = transformAndProcessCallbackBody(
        callbackInfo, mergedMappings, mergedOptionalParams,
        queryParamNames, qi, false, sharedColumnRefs, processArgs,
      );

      const loopStatements = buildLoopStructure(
        qi, systemName, queryInfo, bodyStatements,
        componentCounters, sharedColumnRefs.get(qi) ?? new Set(), factory,
        generatedColumnKeys, allColumnKeyConstants,
      );

      result.push(...loopStatements);
      continue;
    }

    // --- get ---
    const getInfo = findGetCallInStatement(stmt, queryParamNames);
    if (getInfo) {
      const queryInfo = queryInfoMap.get(getInfo.paramName)!;
      const entityExpr = getInfo.getCall.arguments[0];
      const callbackInfo = extractCallbackInfo(getInfo.getCall, 1);

      if (!callbackInfo || !entityExpr) {
        result.push(stmt);
        continue;
      }

      const qi = queryCounter.value++;

      needsEntityLookup.value = true;
      if (queryInfo.notComponents.length > 0) {
        needsSignatureOverlaps.value = true;
      }

      registerQueryComponents(
        queryInfo, componentCounters, nextComponentCounter, usedComponents,
        factory, optSignatureConstants, generatedOptSigs, needsOptionalSupport,
      );

      queryConstants.push(createQueryConstant(systemName, qi, queryInfo, factory));

      // Build merged param-to-component mapping (NO entity — components start at index 0)
      const mergedMappings = new Map(activeMappings);
      const mergedOptionalParams = new Set(activeOptionalParams);

      for (let i = 0; i < queryInfo.queryComponents.length; i++) {
        mergedMappings.set(
          callbackInfo.paramNames[i],
          { componentType: queryInfo.queryComponents[i], queryIndex: qi }
        );
      }
      for (let i = 0; i < queryInfo.optionalComponents.length; i++) {
        const paramIndex = queryInfo.queryComponents.length + i;
        const paramName = callbackInfo.paramNames[paramIndex];
        mergedMappings.set(paramName, { componentType: queryInfo.optionalComponents[i], queryIndex: qi });
        mergedOptionalParams.add(paramName);
      }

      const bodyStatements = transformAndProcessCallbackBody(
        callbackInfo, mergedMappings, mergedOptionalParams,
        queryParamNames, qi, true, sharedColumnRefs, processArgs,
      );

      const { preStatements, resultVarName } = buildGetStructure(
        qi, systemName, queryInfo, entityExpr,
        bodyStatements, componentCounters, sharedColumnRefs.get(qi) ?? new Set(), factory,
        generatedColumnKeys, allColumnKeyConstants,
      );

      const modifiedStmt = replaceCallExprInStatement(
        stmt, getInfo.getCall, factory.createIdentifier(resultVarName), context,
      );

      result.push(...preStatements, modifiedStmt);
      continue;
    }

    // --- has ---
    const hasInfo = findHasCallInStatement(stmt, queryParamNames);
    if (hasInfo) {
      const queryInfo = queryInfoMap.get(hasInfo.paramName)!;
      const entityExpr = hasInfo.hasCall.arguments[0];

      if (!entityExpr) {
        result.push(stmt);
        continue;
      }

      const qi = queryCounter.value++;

      needsEntityLookup.value = true;
      if (queryInfo.notComponents.length > 0) {
        needsSignatureOverlaps.value = true;
      }

      registerQueryComponents(
        queryInfo, componentCounters, nextComponentCounter, usedComponents,
        factory, optSignatureConstants, generatedOptSigs, needsOptionalSupport,
      );

      queryConstants.push(createQueryConstant(systemName, qi, queryInfo, factory));

      const { preStatements, resultVarName } = buildHasStructure(
        qi, systemName, queryInfo, entityExpr, factory,
      );

      const modifiedStmt = replaceCallExprInStatement(
        stmt, hasInfo.hasCall, factory.createIdentifier(resultVarName), context,
      );

      result.push(...preStatements, modifiedStmt);
      continue;
    }

    result.push(stmt);
  }

  return result;
}

// =============================================================================
// Main Transformer
// =============================================================================

function createTransformer(
  _: ts.Program
): ts.TransformerFactory<ts.SourceFile> {
  return (context: ts.TransformationContext) => {
    const factory = context.factory;

    return (sourceFile: ts.SourceFile) => {
      const queryConstants: ts.VariableStatement[] = [];
      const allColumnKeyConstants: ts.VariableStatement[] = [];
      const optionalSignatureConstants: ts.VariableStatement[] = [];
      const needsOptionalSupport = { value: false };
      const needsEntityLookup = { value: false };
      const needsSignatureOverlaps = { value: false };

      // Build a map of imported identifiers -> module path
      const importMap = new Map<string, string>();
      for (const stmt of sourceFile.statements) {
        if (ts.isImportDeclaration(stmt) && stmt.importClause) {
          const moduleSpecifier = (stmt.moduleSpecifier as ts.StringLiteral).text;
          const namedBindings = stmt.importClause.namedBindings;
          if (namedBindings && ts.isNamedImports(namedBindings)) {
            for (const element of namedBindings.elements) {
              importMap.set(element.name.text, moduleSpecifier);
            }
          }
          if (stmt.importClause.name) {
            importMap.set(stmt.importClause.name.text, moduleSpecifier);
          }
        }
      }

      // Track all components used in queries
      const usedComponents = new Set<string>();

      // Track component counters for unique naming
      const componentCounters = new Map<string, number>();
      const nextComponentCounter = { value: 1 };
      const queryCounter = { value: 0 };
      const generatedColumnKeys = new Set<string>();
      const generatedOptSigs = new Set<string>();

      function visit(node: ts.Node): ts.Node {
        if (isSystemFunction(node)) {
          const systemInfo = extractSystemInfo(node);
          if (!systemInfo || !node.body) {
            return node;
          }

          // Build query param lookup
          const queryParamNames = new Set<string>();
          const queryInfoMap = new Map<string, QueryInfo>();
          for (const qi of systemInfo.queries) {
            queryParamNames.add(qi.paramName);
            queryInfoMap.set(qi.paramName, qi);
          }

          // Reset query counter for each system
          queryCounter.value = 0;

          // Process all statements in the function body
          const bodyStatements = Array.from(node.body.statements);
          const sharedColumnRefs = new Map<number, Set<string>>();
          const processedStatements = processStatements(
            bodyStatements,
            queryParamNames,
            queryInfoMap,
            new Map(), // no active mappings at top level
            new Set(), // no active optional params
            systemInfo.name,
            factory,
            context,
            componentCounters,
            nextComponentCounter,
            queryCounter,
            queryConstants,
            allColumnKeyConstants,
            optionalSignatureConstants,
            usedComponents,
            generatedColumnKeys,
            generatedOptSigs,
            needsOptionalSupport,
            needsEntityLookup,
            needsSignatureOverlaps,
            sharedColumnRefs,
          );

          // Return new function with optimized body (remove all query parameters)
          return factory.updateFunctionDeclaration(
            node,
            node.modifiers,
            node.asteriskToken,
            node.name,
            node.typeParameters,
            [], // Remove all query parameters
            node.type,
            factory.createBlock(processedStatements, true)
          );
        }

        return ts.visitEachChild(node, visit, context);
      }

      const transformedFile = ts.visitNode(sourceFile, visit) as ts.SourceFile;

      // Add runtime imports and constants if we transformed any systems
      if (queryConstants.length > 0) {
        const statements = Array.from(transformedFile.statements);

        // Find last import statement
        let lastImportIndex = -1;
        for (let i = 0; i < statements.length; i++) {
          if (ts.isImportDeclaration(statements[i])) {
            lastImportIndex = i;
          }
        }

        // Create runtime import from @conduct/ecs
        const runtimeSpecifiers: ts.ImportSpecifier[] = [
          factory.createImportSpecifier(false, undefined, factory.createIdentifier("ComponentId")),
          factory.createImportSpecifier(false, undefined, factory.createIdentifier("createSignatureFromComponents")),
          factory.createImportSpecifier(false, undefined, factory.createIdentifier("query")),
        ];

        if (needsOptionalSupport.value || needsEntityLookup.value) {
          runtimeSpecifiers.push(
            factory.createImportSpecifier(false, undefined, factory.createIdentifier("signatureContains"))
          );
        }
        if (needsEntityLookup.value) {
          runtimeSpecifiers.push(
            factory.createImportSpecifier(false, undefined, factory.createIdentifier("entityLocations")),
            factory.createImportSpecifier(false, undefined, factory.createIdentifier("archetypes")),
          );
        }
        if (needsSignatureOverlaps.value) {
          runtimeSpecifiers.push(
            factory.createImportSpecifier(false, undefined, factory.createIdentifier("signatureOverlaps"))
          );
        }

        const runtimeImport = factory.createImportDeclaration(
          undefined,
          factory.createImportClause(
            false,
            undefined,
            factory.createNamedImports(runtimeSpecifiers)
          ),
          factory.createStringLiteral("@conduct/ecs")
        );

        // Strip query components from their original imports
        for (let i = statements.length - 1; i >= 0; i--) {
          const stmt = statements[i];
          if (!ts.isImportDeclaration(stmt) || !stmt.importClause) continue;
          const nb = stmt.importClause.namedBindings;
          if (!nb || !ts.isNamedImports(nb)) continue;
          const kept = nb.elements.filter(el => !usedComponents.has(el.name.text));
          if (kept.length === nb.elements.length) continue;
          if (kept.length === 0) {
            statements.splice(i, 1);
            lastImportIndex--;
          } else {
            statements[i] = factory.updateImportDeclaration(stmt, stmt.modifiers,
              factory.updateImportClause(stmt.importClause, stmt.importClause.isTypeOnly, stmt.importClause.name,
                factory.updateNamedImports(nb, kept)),
              stmt.moduleSpecifier, stmt.attributes);
          }
        }

        // Group components by their source module for imports
        const componentsByModule = new Map<string, string[]>();
        for (const comp of usedComponents) {
          const modulePath = importMap.get(comp);
          if (modulePath) {
            const existing = componentsByModule.get(modulePath) ?? [];
            existing.push(comp);
            componentsByModule.set(modulePath, existing);
          }
        }

        // Create component imports
        const componentImports: ts.ImportDeclaration[] = [];
        for (const [modulePath, components] of componentsByModule) {
          const importDecl = factory.createImportDeclaration(
            undefined,
            factory.createImportClause(
              false,
              undefined,
              factory.createNamedImports(
                components.map((comp) =>
                  factory.createImportSpecifier(
                    false,
                    undefined,
                    factory.createIdentifier(comp)
                  )
                )
              )
            ),
            factory.createStringLiteral(modulePath)
          );
          componentImports.push(importDecl);
        }

        // Generate sentinel array for optional column fallback
        const optionalSentinel: ts.VariableStatement[] = [];
        if (needsOptionalSupport.value) {
          optionalSentinel.push(
            factory.createVariableStatement(
              undefined,
              factory.createVariableDeclarationList(
                [
                  factory.createVariableDeclaration(
                    "$__conduct_engine_undef",
                    undefined,
                    undefined,
                    factory.createArrayLiteralExpression([])
                  ),
                ],
                ts.NodeFlags.Const
              )
            )
          );
        }

        // Insert runtime import, component imports, query constants, then column key constants
        statements.splice(
          lastImportIndex + 1,
          0,
          runtimeImport,
          ...componentImports,
          ...queryConstants,
          ...optionalSignatureConstants,
          ...allColumnKeyConstants,
          ...optionalSentinel
        );

        return factory.updateSourceFile(transformedFile, statements);
      }

      return transformedFile;
    };
  };
}

// Export for ts-patch
export default createTransformer;