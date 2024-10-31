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
var directoryPath = path.join(__dirname, "../src");
function getAllFiles(dirPath, arrayOfFiles) {
    if (arrayOfFiles === void 0) { arrayOfFiles = []; }
    var files = fs.readdirSync(dirPath);
    files.forEach(function (file) {
        if (fs.statSync(path.join(dirPath, file)).isDirectory()) {
            arrayOfFiles = getAllFiles(path.join(dirPath, file), arrayOfFiles);
        }
        else {
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
function getComponentTypes(node) {
    return (node.parameters
        //.slice(1) // Skip the first parameter (SystemParams)
        .filter(function (param) { return param.type && ts.isTypeReferenceNode(param.type); })
        .map(function (param) {
        var _a;
        var typeNode = param.type;
        (_a = param.type) === null || _a === void 0 ? void 0 : _a.forEachChild(function (node) {
            typeNode = node;
        });
        console.log(typeNode === null || typeNode === void 0 ? void 0 : typeNode.getText());
        return typeNode === null || typeNode === void 0 ? void 0 : typeNode.getText();
    })
        .filter(function (type) { return !!type; }));
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
var allFiles = getAllFiles(directoryPath);
var importStatementsSet = new Set();
var systemDefinitions = new Set();
allFiles.forEach(function (file) {
    if (file.endsWith(".ts")) {
        var fileContent = fs.readFileSync(file, "utf8");
        var sourceFile = ts.createSourceFile(file, fileContent, ts.ScriptTarget.Latest, true);
        var systemFunctions = findSystemFunctions(sourceFile);
        if (systemFunctions.length > 0) {
            var importPath_1 = path
                .relative(directoryPath, file)
                .replace(/\\/g, "/")
                .replace(/\.ts$/, "");
            systemFunctions.forEach(function (func) {
                var _a, _b, _c;
                importStatementsSet.add("import ".concat((_a = func.name) === null || _a === void 0 ? void 0 : _a.text, " from \"@/").concat(importPath_1, "\";"));
                var componentTypes = getComponentTypes(func);
                systemDefinitions.add("export const ".concat((_b = func.name) === null || _b === void 0 ? void 0 : _b.text, "Definition = {\n            system: ").concat((_c = func.name) === null || _c === void 0 ? void 0 : _c.text, ",\n            queryWith: ").concat(!componentTypes.length
                    ? "[]"
                    : componentTypes.map(function (type) { return type; }).join(", "), " as ComponentType[]\n          };"));
            });
            var importStatements = getImportStatements(sourceFile);
            importStatements.forEach(function (stmt) { return importStatementsSet.add(stmt); });
        }
    }
});
var compiledFilePath = path.join(process.cwd(), "src", "conduct-ecs", "systemDefinitions.ts");
var contents = __spreadArray(__spreadArray(__spreadArray(__spreadArray([], Array.from(importStatementsSet), true), [
    "\n"
], false), Array.from(systemDefinitions), true), [
    "\n",
], false).join("\n");
fs.writeFileSync(compiledFilePath, contents, "utf8");
