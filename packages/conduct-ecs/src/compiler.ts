// @ts-nocheck

import * as ts from "typescript";

/**
 * System Transformer/Compiler
 *
 * A TypeScript transformer that optimizes ECS system functions by transforming
 * ergonomic query.iter() calls into cache-friendly, unrolled loops.
 *
 * # 1. Build the compiler (one-time, or when compiler changes)
 *   npx tsc -p tsconfig.compiler.json && mv src/compiler.js src/compiler.cjs
 *
 * # 2. Build the project (transformer runs automatically)
 *   npx tsc
 *
 * Usage with ts-patch:
 *   1. npm i -D ts-patch
 *   2. npx ts-patch install
 *   3. Add to tsconfig.json:
 *      {
 *        "compilerOptions": {
 *          "plugins": [{ "transform": "./src/ecsTransformer.ts" }]
 *        }
 *      }
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

interface SystemInfo {
  name: string;
  queryComponents: string[];
  notComponents: string[];
  queryParamName: string;
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
  for (const param of func.parameters) {
    if (param.type && ts.isTypeReferenceNode(param.type)) {
      const typeName = param.type.typeName.getText();
      const typeArgs = param.type.typeArguments;

      if (typeName === "Query" && typeArgs && typeArgs.length > 0) {
        const typeArg = typeArgs[0];
        const parsed = parseTypeNode(typeArg);

        return {
          name: func.name!.text,
          queryComponents: parsed.dataComponents,
          notComponents: parsed.filterComponents.not,
          queryParamName: (param.name as ts.Identifier).text,
        };
      }
    }
  }
  return null;
}

// =============================================================================
// Callback Transformation
// =============================================================================

interface CallbackInfo {
  paramNames: string[];
  body: ts.Block | ts.Expression;
}

function extractCallbackInfo(iterCall: ts.CallExpression): CallbackInfo | null {
  const callback = iterCall.arguments[0];

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

function validateNoComponentPassing(
  body: ts.Node,
  paramToComponent: Map<string, string | null>,
  systemName: string
): void {
  function visit(node: ts.Node) {
    if (ts.isCallExpression(node)) {
      node.arguments.forEach((arg) => {
        if (ts.isIdentifier(arg)) {
          const paramName = arg.text;
          const componentType = paramToComponent.get(paramName);

          if (componentType !== undefined && componentType !== null) {
            throw new CompilerError(
              "Cannot pass entire component to function",
              systemName,
              `'${paramName}' (${componentType}) passed to function call. ` +
                `Pass individual properties instead, e.g., '${paramName}.x, ${paramName}.y'`
            );
          }
        }
      });
    }
    ts.forEachChild(node, visit);
  }
  visit(body);
}

// =============================================================================
// AST Transformation Helpers
// =============================================================================

function createQueryConstant(
  systemInfo: SystemInfo,
  factory: ts.NodeFactory
): ts.VariableStatement {
  const queryName = `__query_${systemInfo.name}`;

  // createSignatureFromComponents([ComponentA, ComponentB, ...])
  // This handles lazy ComponentId assignment internally
  const componentRefs = systemInfo.queryComponents.map((c) =>
    factory.createIdentifier(c)
  );

  const requiredSignature = factory.createCallExpression(
    factory.createIdentifier("createSignatureFromComponents"),
    undefined,
    [factory.createArrayLiteralExpression(componentRefs)]
  );

  // Not signature - also use createSignatureFromComponents for consistency
  let notSignature: ts.Expression;
  if (systemInfo.notComponents.length > 0) {
    const notRefs = systemInfo.notComponents.map((c) =>
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

  // { required: ..., not: ..., cache: null, cacheGeneration: 0 }
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

function transformCallbackBody(
  body: ts.Node,
  paramToComponent: Map<string, string | null>,
  columnRefs: Set<string>,
  context: ts.TransformationContext
): ts.Node {
  const factory = context.factory;

  function visit(node: ts.Node): ts.Node {
    // Transform property access: transform.rx -> Transform_rx[c]
    if (ts.isPropertyAccessExpression(node)) {
      const obj = node.expression;
      const prop = node.name.text;

      if (ts.isIdentifier(obj)) {
        const paramName = obj.text;
        const componentType = paramToComponent.get(paramName);

        if (componentType !== undefined && componentType !== null) {
          const columnKey = `${componentType}.${prop}`;
          columnRefs.add(columnKey);

          const localVarName = `${componentType}_${prop}`;
          return factory.createElementAccessExpression(
            factory.createIdentifier(localVarName),
            factory.createIdentifier("c")
          );
        }
      }
    }

    // Transform standalone entity identifier: entity -> arch.entities[c]
    if (ts.isIdentifier(node)) {
      const paramName = node.text;
      const componentType = paramToComponent.get(paramName);

      if (componentType === null) {
        const parent = node.parent;
        if (
          parent &&
          ts.isPropertyAccessExpression(parent) &&
          parent.expression === node
        ) {
          return node;
        }
        return factory.createElementAccessExpression(
          factory.createPropertyAccessExpression(
            factory.createIdentifier("arch"),
            "entities"
          ),
          factory.createIdentifier("c")
        );
      }
    }

    return ts.visitEachChild(node, visit, context);
  }

  return ts.visitNode(body, visit) as ts.Node;
}

function createOptimizedSystemBody(
  systemInfo: SystemInfo,
  callbackInfo: CallbackInfo,
  factory: ts.NodeFactory,
  context: ts.TransformationContext
): ts.Block {
  const queryName = `__query_${systemInfo.name}`;

  // Build param -> component mapping
  const paramToComponent = new Map<string, string | null>();
  paramToComponent.set(callbackInfo.paramNames[0], null); // entity
  for (let i = 1; i < callbackInfo.paramNames.length; i++) {
    paramToComponent.set(
      callbackInfo.paramNames[i],
      systemInfo.queryComponents[i - 1]
    );
  }

  // Validate no component passing
  validateNoComponentPassing(
    callbackInfo.body,
    paramToComponent,
    systemInfo.name
  );

  // Track column references
  const columnRefs = new Set<string>();

  // Transform the callback body
  const transformedBody = transformCallbackBody(
    callbackInfo.body,
    paramToComponent,
    columnRefs,
    context
  );

  // Get statements from body
  let bodyStatements: ts.Statement[];
  if (ts.isBlock(transformedBody)) {
    bodyStatements = Array.from(transformedBody.statements);
  } else {
    bodyStatements = [
      factory.createExpressionStatement(transformedBody as ts.Expression),
    ];
  }

  // Create column extractions: const Transform_x = arch.columns['Transform.x'];
  const columnExtractions = Array.from(columnRefs).map((colKey) => {
    const localVarName = colKey.replace(".", "_");
    return factory.createVariableStatement(
      undefined,
      factory.createVariableDeclarationList(
        [
          factory.createVariableDeclaration(
            localVarName,
            undefined,
            undefined,
            factory.createElementAccessExpression(
              factory.createPropertyAccessExpression(
                factory.createIdentifier("arch"),
                "columns"
              ),
              factory.createStringLiteral(colKey)
            )
          ),
        ],
        ts.NodeFlags.Const
      )
    );
  });

  // const $__conduct_engine_count = arch.count;
  const countDecl = factory.createVariableStatement(
    undefined,
    factory.createVariableDeclarationList(
      [
        factory.createVariableDeclaration(
          "$__conduct_engine_count",
          undefined,
          undefined,
          factory.createPropertyAccessExpression(
            factory.createIdentifier("arch"),
            "count"
          )
        ),
      ],
      ts.NodeFlags.Const
    )
  );

  // Inner loop: for (let c = 0; c < $__conduct_engine_count; c++) { ... }
  const innerLoop = factory.createForStatement(
    factory.createVariableDeclarationList(
      [
        factory.createVariableDeclaration(
          "c",
          undefined,
          undefined,
          factory.createNumericLiteral(0)
        ),
      ],
      ts.NodeFlags.Let
    ),
    factory.createBinaryExpression(
      factory.createIdentifier("c"),
      ts.SyntaxKind.LessThanToken,
      factory.createIdentifier("$__conduct_engine_count")
    ),
    factory.createPostfixIncrement(factory.createIdentifier("c")),
    factory.createBlock(bodyStatements, true)
  );

  // Outer loop: for (let i = 0; i < $__conduct_engine_matches.length; i++) { const arch = $__conduct_engine_matches[i]; ... }
  const outerLoop = factory.createForStatement(
    factory.createVariableDeclarationList(
      [
        factory.createVariableDeclaration(
          "i",
          undefined,
          undefined,
          factory.createNumericLiteral(0)
        ),
      ],
      ts.NodeFlags.Let
    ),
    factory.createBinaryExpression(
      factory.createIdentifier("i"),
      ts.SyntaxKind.LessThanToken,
      factory.createPropertyAccessExpression(
        factory.createIdentifier("$__conduct_engine_matches"),
        "length"
      )
    ),
    factory.createPostfixIncrement(factory.createIdentifier("i")),
    factory.createBlock(
      [
        factory.createVariableStatement(
          undefined,
          factory.createVariableDeclarationList(
            [
              factory.createVariableDeclaration(
                "arch",
                undefined,
                undefined,
                factory.createElementAccessExpression(
                  factory.createIdentifier("$__conduct_engine_matches"),
                  factory.createIdentifier("i")
                )
              ),
            ],
            ts.NodeFlags.Const
          )
        ),
        ...columnExtractions,
        countDecl,
        innerLoop,
      ],
      true
    )
  );

  // const $__conduct_engine_matches = query(__query_systemName);
  const $__conduct_engine_matchesDecl = factory.createVariableStatement(
    undefined,
    factory.createVariableDeclarationList(
      [
        factory.createVariableDeclaration(
          "$__conduct_engine_matches",
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

  return factory.createBlock([$__conduct_engine_matchesDecl, outerLoop], true);
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

      // Build a map of imported identifiers -> module path
      // This helps us re-add imports that TypeScript strips as "type-only"
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
          // Handle default imports
          if (stmt.importClause.name) {
            importMap.set(stmt.importClause.name.text, moduleSpecifier);
          }
        }
      }

      // Track all components used in queries (need to re-import these)
      const usedComponents = new Set<string>();

      function visit(node: ts.Node): ts.Node {
        // Find system functions
        if (isSystemFunction(node)) {
          const systemInfo = extractSystemInfo(node);
          if (!systemInfo) {
            return node;
          }

          // Find the query.iter() call in the function body
          let iterCall: ts.CallExpression | null = null;
          let callbackInfo: CallbackInfo | null = null;

          function findIterCall(n: ts.Node) {
            if (
              ts.isCallExpression(n) &&
              ts.isPropertyAccessExpression(n.expression) &&
              n.expression.name.text === "iter"
            ) {
              iterCall = n;
              callbackInfo = extractCallbackInfo(n);
            }
            ts.forEachChild(n, findIterCall);
          }

          if (node.body) {
            findIterCall(node.body);
          }

          if (!iterCall || !callbackInfo) {
            return node;
          }

          // Track components used in this query (both required and not)
          for (const comp of systemInfo.queryComponents) {
            usedComponents.add(comp);
          }
          for (const comp of systemInfo.notComponents) {
            usedComponents.add(comp);
          }

          // Create query constant (will be added at top of file)
          queryConstants.push(createQueryConstant(systemInfo, factory));

          // Create optimized function body
          const optimizedBody = createOptimizedSystemBody(
            systemInfo,
            callbackInfo,
            factory,
            context
          );

          // Return new function with optimized body (remove query parameter)
          return factory.updateFunctionDeclaration(
            node,
            node.modifiers,
            node.asteriskToken,
            node.name,
            node.typeParameters,
            [], // Remove query parameter
            node.type,
            optimizedBody
          );
        }

        return ts.visitEachChild(node, visit, context);
      }

      const transformedFile = ts.visitNode(sourceFile, visit) as ts.SourceFile;

      // Add runtime import and query constants if we have any systems
      if (queryConstants.length > 0) {
        const statements = Array.from(transformedFile.statements);

        // Find last import statement
        let lastImportIndex = -1;
        for (let i = 0; i < statements.length; i++) {
          if (ts.isImportDeclaration(statements[i])) {
            lastImportIndex = i;
          }
        }

        // Create runtime import: import { createSignatureFromComponents, query } from "./core.js";
        const runtimeImport = factory.createImportDeclaration(
          undefined,
          factory.createImportClause(
            false,
            undefined,
            factory.createNamedImports([
              factory.createImportSpecifier(
                false,
                undefined,
                factory.createIdentifier("createSignatureFromComponents")
              ),
              factory.createImportSpecifier(
                false,
                undefined,
                factory.createIdentifier("query")
              ),
            ])
          ),
          factory.createStringLiteral("./core.js")
        );

        // Group components by their source module for efficient imports
        const componentsByModule = new Map<string, string[]>();
        for (const comp of usedComponents) {
          const modulePath = importMap.get(comp);
          if (modulePath) {
            // Component is imported from another module - need to re-add import
            const existing = componentsByModule.get(modulePath) ?? [];
            existing.push(comp);
            componentsByModule.set(modulePath, existing);
          }
          // If component is not in importMap, it's defined locally - no import needed
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

        // Insert runtime import, component imports, then query constants
        statements.splice(lastImportIndex + 1, 0, runtimeImport, ...componentImports, ...queryConstants);

        return factory.updateSourceFile(transformedFile, statements);
      }

      return transformedFile;
    };
  };
}

// Export for ts-patch
export default createTransformer;
