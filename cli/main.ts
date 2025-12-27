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

const pathArg = process.argv[2];
const ignoreGlob = process.argv[3];

const OPERATORS = ["Not", "Optional"];

interface ParsedQuery {
  dataComponents: string[];
  filterComponents: {
    not: string[];
    optional: string[];
  };
}

function parseTypeNode(node: ts.TypeNode): ParsedQuery {
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
            const nested = parseTypeNode(element);
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
      const nested = parseTypeNode(element);
      result.dataComponents.push(...nested.dataComponents);
      result.filterComponents.not.push(...nested.filterComponents.not);
      result.filterComponents.optional.push(
        ...nested.filterComponents.optional
      );
    });
  }

  return result;
}

function parseQueryParameters(func: ts.FunctionDeclaration): ParsedQuery[] {
  return func.parameters
    .filter((param) => param.type && ts.isTypeReferenceNode(param.type))
    .filter((param) => {
      const type = param.type as ts.TypeReferenceNode;
      return type.typeName.getText() === "Query";
    })
    .map((param) => {
      const type = param.type as ts.TypeReferenceNode;
      const typeArgs = type.typeArguments;

      if (!typeArgs || typeArgs.length === 0) {
        return {
          dataComponents: [],
          filterComponents: { not: [], optional: [] },
        };
      }

      return parseTypeNode(typeArgs[0]);
    });
}

const directoryPaths = [
  path.join(__dirname, "../src/conduct-ecs"),
  path.join(__dirname, "../src/game/src"),
  path.join(__dirname, "../src/", pathArg),
];

function getAllFiles(dirPath: string, arrayOfFiles: string[] = []): string[] {
  const files = fs.readdirSync(dirPath);

  files.forEach((file) => {
    if (fs.statSync(path.join(dirPath, file)).isDirectory()) {
      arrayOfFiles = getAllFiles(path.join(dirPath, file), arrayOfFiles);
    } else if (ignoreGlob && !file.includes(ignoreGlob)) {
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

// const allFiles = getAllFiles(directoryPath);
const importStatementsSet = new Set<string>();
const systemDefinitions = new Set<string>();

directoryPaths.forEach((dirPath) => {
  const allFiles = getAllFiles(dirPath);

  console.log("compiling systems in", dirPath);

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
          .relative(path.join(__dirname, "../src"), file)
          .replace(/\\/g, "/")
          .replace(/\.ts$/, "");

        systemFunctions.forEach((func) => {
          importStatementsSet.add(
            `import ${func.name?.text} from "@/${importPath}";`
          );

          const parsedQueries = parseQueryParameters(func);
          const queriesStr = parsedQueries
            .map(
              (q) =>
                `{ dataComponents: [${q.dataComponents.join(
                  ", "
                )}], filterComponents: { not: [${q.filterComponents.not.join(
                  ", "
                )}] as const, optional: [${q.filterComponents.optional.join(
                  ", "
                )}] as const } }`
            )

            .join(", ");

          systemDefinitions.add(
            `export const ${func.name?.text}Definition: SystemDefinition = {
  system: ${func.name?.text},
  queries: [${queriesStr}]
};`
          );
        });

        const importStatements = getImportStatements(sourceFile);
        importStatements.forEach((stmt) => importStatementsSet.add(stmt));
      }
    }
  });
});

const compiledFilePath = path.join(
  process.cwd(),
  "src",
  pathArg,
  "systemDefinitions.ts"
);

const contents = [
  'import { SystemDefinition } from "@/conduct-ecs/system";',
  ...Array.from(importStatementsSet),
  "\n",
  ...Array.from(systemDefinitions),
  "\n",
].join("\n");

fs.writeFileSync(compiledFilePath, contents, "utf8");
