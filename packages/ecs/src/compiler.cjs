"use strict";
// @ts-nocheck
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
const ts = __importStar(require("typescript"));
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
    constructor(message, systemName, detail) {
        super(`[${systemName}] ${message}${detail ? `: ${detail}` : ""}`);
        this.systemName = systemName;
        this.detail = detail;
        this.name = "CompilerError";
    }
}
function parseTypeNode(node, typeChecker) {
    const result = {
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
                        }
                        else if (typeName === "Optional") {
                            result.filterComponents.optional.push(...nested.dataComponents);
                        }
                    });
                }
            }
        }
        else {
            result.dataComponents.push(typeName);
        }
    }
    else if (ts.isTupleTypeNode(node)) {
        node.elements.forEach((element) => {
            const nested = parseTypeNode(element, typeChecker);
            result.dataComponents.push(...nested.dataComponents);
            result.filterComponents.not.push(...nested.filterComponents.not);
            result.filterComponents.optional.push(...nested.filterComponents.optional);
        });
    }
    return result;
}
function isSystemFunction(node) {
    if (!ts.isFunctionDeclaration(node))
        return false;
    if (!node.name || !node.name.text.endsWith("System"))
        return false;
    // Check for default export
    const hasExport = node.modifiers &&
        node.modifiers.some((m) => m.kind === ts.SyntaxKind.ExportKeyword);
    const hasDefault = node.modifiers &&
        node.modifiers.some((m) => m.kind === ts.SyntaxKind.DefaultKeyword);
    return !!(hasExport && hasDefault);
}
function extractSystemInfo(func) {
    for (const param of func.parameters) {
        if (param.type && ts.isTypeReferenceNode(param.type)) {
            const typeName = param.type.typeName.getText();
            const typeArgs = param.type.typeArguments;
            if (typeName === "Query" && typeArgs && typeArgs.length > 0) {
                const typeArg = typeArgs[0];
                const parsed = parseTypeNode(typeArg);
                return {
                    name: func.name.text,
                    queryComponents: parsed.dataComponents,
                    notComponents: parsed.filterComponents.not,
                    queryParamName: param.name.text,
                };
            }
        }
    }
    return null;
}
function extractCallbackInfo(iterCall) {
    const callback = iterCall.arguments[0];
    if (!callback ||
        (!ts.isArrowFunction(callback) && !ts.isFunctionExpression(callback))) {
        return null;
    }
    const firstParam = callback.parameters[0];
    if (!firstParam || !ts.isArrayBindingPattern(firstParam.name)) {
        return null;
    }
    const paramNames = firstParam.name.elements
        .filter((el) => ts.isBindingElement(el))
        .map((el) => el.name.text);
    return {
        paramNames,
        body: callback.body,
    };
}
function validateNoComponentPassing(body, paramToComponent, systemName) {
    function visit(node) {
        if (ts.isCallExpression(node)) {
            node.arguments.forEach((arg) => {
                if (ts.isIdentifier(arg)) {
                    const paramName = arg.text;
                    const componentType = paramToComponent.get(paramName);
                    if (componentType !== undefined && componentType !== null) {
                        throw new CompilerError("Cannot pass entire component to function", systemName, `'${paramName}' (${componentType}) passed to function call. ` +
                            `Pass individual properties instead, e.g., '${paramName}.x, ${paramName}.y'`);
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
function createQueryConstant(systemInfo, factory) {
    const queryName = `__query_${systemInfo.name}`;
    // createSignatureFromComponents([ComponentA, ComponentB, ...])
    // This handles lazy ComponentId assignment internally
    const componentRefs = systemInfo.queryComponents.map((c) => factory.createIdentifier(c));
    const requiredSignature = factory.createCallExpression(factory.createIdentifier("createSignatureFromComponents"), undefined, [factory.createArrayLiteralExpression(componentRefs)]);
    // Not signature - also use createSignatureFromComponents for consistency
    let notSignature;
    if (systemInfo.notComponents.length > 0) {
        const notRefs = systemInfo.notComponents.map((c) => factory.createIdentifier(c));
        notSignature = factory.createCallExpression(factory.createIdentifier("createSignatureFromComponents"), undefined, [factory.createArrayLiteralExpression(notRefs)]);
    }
    else {
        notSignature = factory.createArrayLiteralExpression([]);
    }
    // { required: ..., not: ..., cache: null, cacheGeneration: 0 }
    const queryObject = factory.createObjectLiteralExpression([
        factory.createPropertyAssignment("required", requiredSignature),
        factory.createPropertyAssignment("not", notSignature),
        factory.createPropertyAssignment("cache", factory.createNull()),
        factory.createPropertyAssignment("cacheGeneration", factory.createNumericLiteral(0)),
    ]);
    return factory.createVariableStatement(undefined, factory.createVariableDeclarationList([
        factory.createVariableDeclaration(queryName, undefined, undefined, queryObject),
    ], ts.NodeFlags.Const));
}
function transformCallbackBody(body, paramToComponent, columnRefs, context) {
    const factory = context.factory;
    function visit(node) {
        // Transform property access: transform.rx -> Transform_rx[$__conduct_engine_c]
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
                    return factory.createElementAccessExpression(factory.createIdentifier(localVarName), factory.createIdentifier("$__conduct_engine_c"));
                }
            }
        }
        // Transform standalone entity identifier: entity -> $__conduct_engine_arch.entities[$__conduct_engine_c]
        if (ts.isIdentifier(node)) {
            const paramName = node.text;
            const componentType = paramToComponent.get(paramName);
            if (componentType === null) {
                const parent = node.parent;
                if (parent &&
                    ts.isPropertyAccessExpression(parent) &&
                    parent.expression === node) {
                    return node;
                }
                return factory.createElementAccessExpression(factory.createPropertyAccessExpression(factory.createIdentifier("$__conduct_engine_arch"), "entities"), factory.createIdentifier("$__conduct_engine_c"));
            }
        }
        return ts.visitEachChild(node, visit, context);
    }
    return ts.visitNode(body, visit);
}
function createOptimizedSystemBody(systemInfo, callbackInfo, factory, context, componentCounters) {
    const queryName = `__query_${systemInfo.name}`;
    // Build param -> component mapping
    const paramToComponent = new Map();
    paramToComponent.set(callbackInfo.paramNames[0], null); // entity
    for (let i = 1; i < callbackInfo.paramNames.length; i++) {
        paramToComponent.set(callbackInfo.paramNames[i], systemInfo.queryComponents[i - 1]);
    }
    // Validate no component passing
    validateNoComponentPassing(callbackInfo.body, paramToComponent, systemInfo.name);
    // Track column references
    const columnRefs = new Set();
    // Transform the callback body
    const transformedBody = transformCallbackBody(callbackInfo.body, paramToComponent, columnRefs, context);
    // Get statements from body
    let bodyStatements;
    if (ts.isBlock(transformedBody)) {
        bodyStatements = Array.from(transformedBody.statements);
    }
    else {
        bodyStatements = [
            factory.createExpressionStatement(transformedBody),
        ];
    }
    // Generate column key constants and extractions
    const columnKeyConstants = [];
    const columnExtractions = [];
    for (const colKey of columnRefs) {
        const [componentName, propName] = colKey.split(".");
        const componentCounter = componentCounters.get(componentName);
        const columnKeyVarName = `$__conduct_engine_${componentName}${componentCounter}_${propName}`;
        // Build column key: "<ComponentName>." + <Component>[ComponentId] + ".<prop>"
        const columnKeyExpr = factory.createBinaryExpression(factory.createBinaryExpression(factory.createStringLiteral(`${componentName}.`), ts.SyntaxKind.PlusToken, factory.createElementAccessExpression(factory.createIdentifier(componentName), factory.createIdentifier("ComponentId"))), ts.SyntaxKind.PlusToken, factory.createStringLiteral(`.${propName}`));
        columnKeyConstants.push(factory.createVariableStatement(undefined, factory.createVariableDeclarationList([
            factory.createVariableDeclaration(columnKeyVarName, undefined, undefined, columnKeyExpr),
        ], ts.NodeFlags.Const)));
        const localVarName = colKey.replace(".", "_");
        columnExtractions.push(factory.createVariableStatement(undefined, factory.createVariableDeclarationList([
            factory.createVariableDeclaration(localVarName, undefined, undefined, factory.createElementAccessExpression(factory.createPropertyAccessExpression(factory.createIdentifier("$__conduct_engine_arch"), "columns"), factory.createIdentifier(columnKeyVarName))),
        ], ts.NodeFlags.Const)));
    }
    // const $__conduct_engine_count = $__conduct_engine_arch.count;
    const countDecl = factory.createVariableStatement(undefined, factory.createVariableDeclarationList([
        factory.createVariableDeclaration("$__conduct_engine_count", undefined, undefined, factory.createPropertyAccessExpression(factory.createIdentifier("$__conduct_engine_arch"), "count")),
    ], ts.NodeFlags.Const));
    // Inner loop: for (let $__conduct_engine_c = 0; $__conduct_engine_c < $__conduct_engine_count; $__conduct_engine_c++) { ... }
    const innerLoop = factory.createForStatement(factory.createVariableDeclarationList([
        factory.createVariableDeclaration("$__conduct_engine_c", undefined, undefined, factory.createNumericLiteral(0)),
    ], ts.NodeFlags.Let), factory.createBinaryExpression(factory.createIdentifier("$__conduct_engine_c"), ts.SyntaxKind.LessThanToken, factory.createIdentifier("$__conduct_engine_count")), factory.createPostfixIncrement(factory.createIdentifier("$__conduct_engine_c")), factory.createBlock(bodyStatements, true));
    // Outer loop: for (let $__conduct_engine_i = 0; $__conduct_engine_i < $__conduct_engine_matches.length; $__conduct_engine_i++) { const $__conduct_engine_arch = $__conduct_engine_matches[$__conduct_engine_i]; ... }
    const outerLoop = factory.createForStatement(factory.createVariableDeclarationList([
        factory.createVariableDeclaration("$__conduct_engine_i", undefined, undefined, factory.createNumericLiteral(0)),
    ], ts.NodeFlags.Let), factory.createBinaryExpression(factory.createIdentifier("$__conduct_engine_i"), ts.SyntaxKind.LessThanToken, factory.createPropertyAccessExpression(factory.createIdentifier("$__conduct_engine_matches"), "length")), factory.createPostfixIncrement(factory.createIdentifier("$__conduct_engine_i")), factory.createBlock([
        factory.createVariableStatement(undefined, factory.createVariableDeclarationList([
            factory.createVariableDeclaration("$__conduct_engine_arch", undefined, undefined, factory.createElementAccessExpression(factory.createIdentifier("$__conduct_engine_matches"), factory.createIdentifier("$__conduct_engine_i"))),
        ], ts.NodeFlags.Const)),
        ...columnExtractions,
        countDecl,
        innerLoop,
    ], true));
    // const $__conduct_engine_matches = query(__query_systemName);
    const $__conduct_engine_matchesDecl = factory.createVariableStatement(undefined, factory.createVariableDeclarationList([
        factory.createVariableDeclaration("$__conduct_engine_matches", undefined, undefined, factory.createCallExpression(factory.createIdentifier("query"), undefined, [factory.createIdentifier(queryName)])),
    ], ts.NodeFlags.Const));
    return {
        body: factory.createBlock([$__conduct_engine_matchesDecl, outerLoop], true),
        columnKeyConstants,
    };
}
// =============================================================================
// Main Transformer
// =============================================================================
function createTransformer(_) {
    return (context) => {
        const factory = context.factory;
        return (sourceFile) => {
            const queryConstants = [];
            const allColumnKeyConstants = [];
            // Build a map of imported identifiers -> module path
            // This helps us re-add imports that TypeScript strips as "type-only"
            const importMap = new Map();
            for (const stmt of sourceFile.statements) {
                if (ts.isImportDeclaration(stmt) && stmt.importClause) {
                    const moduleSpecifier = stmt.moduleSpecifier.text;
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
            const usedComponents = new Set();
            // Track component counters for unique naming (ComponentName -> counter)
            // This allows same-named components from different modules to have different column keys
            const componentCounters = new Map();
            let nextComponentCounter = 1;
            function visit(node) {
                // Find system functions
                if (isSystemFunction(node)) {
                    const systemInfo = extractSystemInfo(node);
                    if (!systemInfo) {
                        return node;
                    }
                    // Find the query.iter() call in the function body
                    let iterCall = null;
                    let callbackInfo = null;
                    function findIterCall(n) {
                        if (ts.isCallExpression(n) &&
                            ts.isPropertyAccessExpression(n.expression) &&
                            n.expression.name.text === "iter") {
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
                    // and assign counters to new components
                    for (const comp of systemInfo.queryComponents) {
                        usedComponents.add(comp);
                        if (!componentCounters.has(comp)) {
                            componentCounters.set(comp, nextComponentCounter++);
                        }
                    }
                    for (const comp of systemInfo.notComponents) {
                        usedComponents.add(comp);
                        if (!componentCounters.has(comp)) {
                            componentCounters.set(comp, nextComponentCounter++);
                        }
                    }
                    // Create query constant (will be added at top of file)
                    queryConstants.push(createQueryConstant(systemInfo, factory));
                    // Create optimized function body
                    const optimizedResult = createOptimizedSystemBody(systemInfo, callbackInfo, factory, context, componentCounters);
                    // Collect column key constants
                    allColumnKeyConstants.push(...optimizedResult.columnKeyConstants);
                    // Return new function with optimized body (remove query parameter)
                    return factory.updateFunctionDeclaration(node, node.modifiers, node.asteriskToken, node.name, node.typeParameters, [], // Remove query parameter
                    node.type, optimizedResult.body);
                }
                return ts.visitEachChild(node, visit, context);
            }
            const transformedFile = ts.visitNode(sourceFile, visit);
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
                // Create runtime import from @conduct/ecs
                const runtimeImport = factory.createImportDeclaration(undefined, factory.createImportClause(false, undefined, factory.createNamedImports([
                    factory.createImportSpecifier(false, undefined, factory.createIdentifier("ComponentId")),
                    factory.createImportSpecifier(false, undefined, factory.createIdentifier("createSignatureFromComponents")),
                    factory.createImportSpecifier(false, undefined, factory.createIdentifier("query")),
                ])), factory.createStringLiteral("@conduct/ecs"));
                // Group components by their source module for efficient imports
                const componentsByModule = new Map();
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
                const componentImports = [];
                for (const [modulePath, components] of componentsByModule) {
                    const importDecl = factory.createImportDeclaration(undefined, factory.createImportClause(false, undefined, factory.createNamedImports(components.map((comp) => factory.createImportSpecifier(false, undefined, factory.createIdentifier(comp))))), factory.createStringLiteral(modulePath));
                    componentImports.push(importDecl);
                }
                // Insert runtime import, component imports, query constants, then column key constants
                statements.splice(lastImportIndex + 1, 0, runtimeImport, ...componentImports, ...queryConstants, ...allColumnKeyConstants);
                return factory.updateSourceFile(transformedFile, statements);
            }
            return transformedFile;
        };
    };
}
// Export for ts-patch
exports.default = createTransformer;
