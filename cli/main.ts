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

import * as fs from "fs";
import * as path from "path";
import * as ts from "typescript";
import { TypeNode } from "typescript";

const directoryPath = path.join(__dirname, "../src");

function getAllFiles(dirPath: string, arrayOfFiles: string[] = []): string[] {
  const files = fs.readdirSync(dirPath);

  files.forEach((file) => {
    if (fs.statSync(path.join(dirPath, file)).isDirectory()) {
      arrayOfFiles = getAllFiles(path.join(dirPath, file), arrayOfFiles);
    } else {
      arrayOfFiles.push(path.join(dirPath, file));
    }
  });

  return arrayOfFiles;
}

function findSystemFunctions(
  sourceFile: ts.SourceFile
): ts.FunctionDeclaration[] {
  const systemFunctions: ts.FunctionDeclaration[] = [];

  function visit(node: ts.Node) {
    if (
      ts.isFunctionDeclaration(node) &&
      node.name?.text.endsWith("System") &&
      !node.name?.text.endsWith("InitSystem")
    ) {
      systemFunctions.push(node);
    }
    ts.forEachChild(node, visit);
  }

  visit(sourceFile);
  return systemFunctions;
}

function getComponentTypes(node: ts.FunctionDeclaration): string[] {
  return (
    node.parameters
      //.slice(1) // Skip the first parameter (SystemParams)
      .filter((param) => param.type && ts.isTypeReferenceNode(param.type))
      .map((param) => {
        let typeNode: TypeNode | ts.Node | undefined = param.type;
        param.type?.forEachChild((node) => {
          typeNode = node;
        });
        console.log(typeNode?.getText());
        return typeNode?.getText();
      })
      .filter((type): type is string => !!type)
  );
}

function getImportStatements(sourceFile: ts.SourceFile): string[] {
  const importStatements: string[] = [];

  function visit(node: ts.Node) {
    if (ts.isImportDeclaration(node) && node.getText().includes("Component")) {
      importStatements.push(node.getText());
    }
    ts.forEachChild(node, visit);
  }

  visit(sourceFile);
  return importStatements;
}

const allFiles = getAllFiles(directoryPath);
const importStatementsSet = new Set<string>();
const systemDefinitions = new Set<string>();

allFiles.forEach((file) => {
  if (file.endsWith(".ts")) {
    const fileContent = fs.readFileSync(file, "utf8");
    const sourceFile = ts.createSourceFile(
      file,
      fileContent,
      ts.ScriptTarget.Latest,
      true
    );

    const systemFunctions = findSystemFunctions(sourceFile);
    if (systemFunctions.length > 0) {
      const importPath = path
        .relative(directoryPath, file)
        .replace(/\\/g, "/")
        .replace(/\.ts$/, "");

      systemFunctions.forEach((func) => {
        importStatementsSet.add(
          `import ${func.name?.text} from "@/${importPath}";`
        );

        const componentTypes = getComponentTypes(func);
        systemDefinitions.add(
          `export const ${func.name?.text}Definition = {
            system: ${func.name?.text},
            queryWith: ${
              !componentTypes.length
                ? "[]"
                : componentTypes.map((type) => type).join(", ")
            } as ComponentType[]
          };`
        );
      });

      const importStatements = getImportStatements(sourceFile);
      importStatements.forEach((stmt) => importStatementsSet.add(stmt));
    }
  }
});

const compiledFilePath = path.join(
  process.cwd(),
  "src",
  "conduct-ecs",
  "systemDefinitions.ts"
);

const contents = [
  ...Array.from(importStatementsSet),
  "\n",
  ...Array.from(systemDefinitions),
  "\n",
].join("\n");

fs.writeFileSync(compiledFilePath, contents, "utf8");
