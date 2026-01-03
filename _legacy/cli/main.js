"use strict";
// import * as fs from "fs";
// import * as path from "path";
// import * as ts from "typescript";
// import { TypeNode } from "typescript";
//
// const code = `
// abstract class Component {
//   protected readonly COMPONENT_TYPE: ComponentConstructor = this
//     .constructor as ComponentConstructor;
// }
//
// class TestOne extends Component {
//   value = 0;
// }
//
// class TestTwo extends Component {
//   value!: number;
// }
//
// interface SystemParams {
//   entity: number;
//   // other params
// }
//
// function TestSystem(params: SystemParams, one: Readonly<TestOne>, two: TestTwo) {
//   one.value++;
// }
// `;
//
// const sourceFile = ts.createSourceFile(
//   "temp.ts",
//   code,
//   ts.ScriptTarget.Latest,
//   true
// );
//
// function findSystemDefinition(
//   node: ts.Node
// ): ts.FunctionDeclaration | undefined {
//   if (ts.isFunctionDeclaration(node) && node.name?.text === "TestSystem") {
//     return node;
//   }
//   return ts.forEachChild(node, findSystemDefinition);
// }
//
// function getComponentTypes(node: ts.FunctionDeclaration): string[] {
//   return node.parameters
//     .slice(1) // Skip the first parameter (SystemParams)
//     .filter((param) => param.type && ts.isTypeReferenceNode(param.type))
//     .map((param) => {
//       let typeNode: TypeNode | ts.Node | undefined = param.type;
//       param.type?.forEachChild((node) => {
//         typeNode = node;
//       });
//       return typeNode?.getText();
//     })
//     .filter((type): type is string => !!type);
// }
//
// const systemNode = findSystemDefinition(sourceFile) as ts.FunctionDeclaration;
// const componentTypes = getComponentTypes(systemNode);
//
// const systemDefinition = {
//   system: systemNode.name?.text,
//   components: componentTypes,
// };
//
// fs.writeFile(
//   path.resolve(__dirname, "output.ts"),
//   `export const systemDefinition = ${JSON.stringify(
//     systemDefinition,
//     null,
//     2
//   )};`,
//   (err) => {
//     if (err) {
//       console.error(err);
//     }
//   }
// );
var __spreadArray = (this && this.__spreadArray) || function (to, from, pack) {
    if (pack || arguments.length === 2) for (var i = 0, l = from.length, ar; i < l; i++) {
        if (ar || !(i in from)) {
            if (!ar) ar = Array.prototype.slice.call(from, 0, i);
            ar[i] = from[i];
        }
    }
    return to.concat(ar || Array.prototype.slice.call(from));
};
Object.defineProperty(exports, "__esModule", { value: true });
var fs = require("fs");
var path = require("path");
var ts = require("typescript");
var pathArg = process.argv[2];
var ignoreGlob = process.argv[3];
var OPERATORS = ["Not", "Optional"];
function parseTypeNode(node) {
    var result = {
        dataComponents: [],
        filterComponents: { not: [], optional: [] },
    };
    if (ts.isTypeReferenceNode(node)) {
        var typeName_1 = node.typeName.getText();
        if (OPERATORS.includes(typeName_1)) {
            var typeArgs = node.typeArguments;
            if (typeArgs && typeArgs.length > 0) {
                var firstArg = typeArgs[0];
                if (ts.isTupleTypeNode(firstArg)) {
                    firstArg.elements.forEach(function (element) {
                        var _a, _b;
                        var nested = parseTypeNode(element);
                        if (typeName_1 === "Not") {
                            (_a = result.filterComponents.not).push.apply(_a, nested.dataComponents);
                        }
                        else if (typeName_1 === "Optional") {
                            (_b = result.filterComponents.optional).push.apply(_b, nested.dataComponents);
                        }
                    });
                }
            }
        }
        else {
            result.dataComponents.push(typeName_1);
        }
    }
    else if (ts.isTupleTypeNode(node)) {
        node.elements.forEach(function (element) {
            var _a, _b, _c;
            var nested = parseTypeNode(element);
            (_a = result.dataComponents).push.apply(_a, nested.dataComponents);
            (_b = result.filterComponents.not).push.apply(_b, nested.filterComponents.not);
            (_c = result.filterComponents.optional).push.apply(_c, nested.filterComponents.optional);
        });
    }
    return result;
}
function parseQueryParameters(func) {
    return func.parameters
        .filter(function (param) { return param.type && ts.isTypeReferenceNode(param.type); })
        .filter(function (param) {
        var type = param.type;
        return type.typeName.getText() === "Query";
    })
        .map(function (param) {
        var type = param.type;
        var typeArgs = type.typeArguments;
        if (!typeArgs || typeArgs.length === 0) {
            return { dataComponents: [], filterComponents: { not: [], optional: [] } };
        }
        return parseTypeNode(typeArgs[0]);
    });
}
var directoryPaths = [
    path.join(__dirname, "../src/conduct-ecs"),
    path.join(__dirname, "../src/game/src"),
    path.join(__dirname, "../src/", pathArg),
];
function getAllFiles(dirPath, arrayOfFiles) {
    if (arrayOfFiles === void 0) { arrayOfFiles = []; }
    var files = fs.readdirSync(dirPath);
    files.forEach(function (file) {
        if (fs.statSync(path.join(dirPath, file)).isDirectory()) {
            arrayOfFiles = getAllFiles(path.join(dirPath, file), arrayOfFiles);
        }
        else if (ignoreGlob && !file.includes(ignoreGlob)) {
            arrayOfFiles.push(path.join(dirPath, file));
        }
    });
    return arrayOfFiles;
}
function findSystemFunctions(sourceFile) {
    var systemFunctions = [];
    function visit(node) {
        var _a, _b;
        if (ts.isFunctionDeclaration(node) &&
            ((_a = node.name) === null || _a === void 0 ? void 0 : _a.text.endsWith("System")) &&
            !((_b = node.name) === null || _b === void 0 ? void 0 : _b.text.endsWith("InitSystem"))) {
            systemFunctions.push(node);
        }
        ts.forEachChild(node, visit);
    }
    visit(sourceFile);
    return systemFunctions;
}
function getImportStatements(sourceFile) {
    var importStatements = [];
    function visit(node) {
        if (ts.isImportDeclaration(node) && node.getText().includes("Component")) {
            importStatements.push(node.getText());
        }
        ts.forEachChild(node, visit);
    }
    visit(sourceFile);
    return importStatements;
}
// const allFiles = getAllFiles(directoryPath);
var importStatementsSet = new Set();
var systemDefinitions = new Set();
directoryPaths.forEach(function (dirPath) {
    var allFiles = getAllFiles(dirPath);
    console.log("compiling systems in", dirPath);
    allFiles.forEach(function (file) {
        if (file.endsWith(".ts")) {
            var fileContent = fs.readFileSync(file, "utf8");
            var sourceFile = ts.createSourceFile(file, fileContent, ts.ScriptTarget.Latest, true);
            var systemFunctions = findSystemFunctions(sourceFile);
            if (systemFunctions.length > 0) {
                var importPath_1 = path
                    .relative(path.join(__dirname, "../src"), file)
                    .replace(/\\/g, "/")
                    .replace(/\.ts$/, "");
                systemFunctions.forEach(function (func) {
                    var _a, _b, _c;
                    importStatementsSet.add("import ".concat((_a = func.name) === null || _a === void 0 ? void 0 : _a.text, " from \"@/").concat(importPath_1, "\";"));
                    var parsedQueries = parseQueryParameters(func);
                    var queriesStr = parsedQueries
                        .map(function (q) {
                        return "{ dataComponents: [".concat(q.dataComponents.join(", "), "], filterComponents: { not: [").concat(q.filterComponents.not.join(", "), "] as const, optional: [").concat(q.filterComponents.optional.join(", "), "] as const } }");
                    })
                        .join(", ");
                    systemDefinitions.add("export const ".concat((_b = func.name) === null || _b === void 0 ? void 0 : _b.text, "Definition: SystemDefinition = {\n  system: ").concat((_c = func.name) === null || _c === void 0 ? void 0 : _c.text, ",\n  queries: [").concat(queriesStr, "]\n};"));
                });
                var importStatements = getImportStatements(sourceFile);
                importStatements.forEach(function (stmt) { return importStatementsSet.add(stmt); });
            }
        }
    });
});
var compiledFilePath = path.join(process.cwd(), "src", pathArg, "systemDefinitions.ts");
var contents = __spreadArray(__spreadArray(__spreadArray(__spreadArray([
    'import { SystemDefinition } from "@/conduct-ecs/system";'
], Array.from(importStatementsSet), true), [
    "\n"
], false), Array.from(systemDefinitions), true), [
    "\n",
], false).join("\n");
fs.writeFileSync(compiledFilePath, contents, "utf8");
