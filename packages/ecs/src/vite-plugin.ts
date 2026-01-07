import * as ts from "typescript";
import { resolve, dirname } from "path";
import { existsSync, readFileSync } from "fs";
import { createRequire } from "module";
import type { Plugin, ResolvedConfig } from "vite";

// Import the CommonJS compiler using createRequire
const require = createRequire(import.meta.url);

// The compiler is built as CommonJS for ts-patch compatibility
const createTransformer: (program: ts.Program) => ts.TransformerFactory<ts.SourceFile> =
  require("./compiler.cjs").default;

interface ConductPluginOptions {
  /** Additional file patterns to transform (default: files ending with System.ts) */
  include?: RegExp[];
  /** File patterns to exclude from transformation */
  exclude?: RegExp[];
}

/**
 * Vite plugin that applies the Conduct ECS system transformer during development.
 * This enables the ergonomic query.iter() API to work with Vite's dev server.
 */
export function conductVitePlugin(options: ConductPluginOptions = {}): Plugin {
  let config: ResolvedConfig;
  let compilerOptions: ts.CompilerOptions;

  const defaultInclude = [/System\.tsx?$/];
  const include = options.include ?? defaultInclude;
  const exclude = options.exclude ?? [/node_modules/];

  function shouldTransform(id: string): boolean {
    // Check excludes first
    for (const pattern of exclude) {
      if (pattern.test(id)) {
        return false;
      }
    }
    // Check includes
    for (const pattern of include) {
      if (pattern.test(id)) {
        return true;
      }
    }
    return false;
  }

  function findTsConfig(startDir: string): string | null {
    let dir = startDir;
    while (dir !== dirname(dir)) {
      const configPath = resolve(dir, "tsconfig.json");
      if (existsSync(configPath)) {
        return configPath;
      }
      dir = dirname(dir);
    }
    return null;
  }

  function loadCompilerOptions(configPath: string): ts.CompilerOptions {
    const configFile = ts.readConfigFile(configPath, ts.sys.readFile);
    if (configFile.error) {
      console.warn("[conduct] Failed to read tsconfig.json:", configFile.error.messageText);
      return {};
    }

    const parsed = ts.parseJsonConfigFileContent(
      configFile.config,
      ts.sys,
      dirname(configPath)
    );

    return parsed.options;
  }

  return {
    name: "conduct-ecs-transformer",
    enforce: "pre",

    configResolved(resolvedConfig) {
      config = resolvedConfig;

      // Find and load tsconfig.json
      const tsconfigPath = findTsConfig(config.root);
      if (tsconfigPath) {
        compilerOptions = loadCompilerOptions(tsconfigPath);
      } else {
        // Sensible defaults
        compilerOptions = {
          target: ts.ScriptTarget.ES2022,
          module: ts.ModuleKind.ESNext,
          moduleResolution: ts.ModuleResolutionKind.Bundler,
          esModuleInterop: true,
          strict: true,
        };
      }

      // Ensure we emit ESM for Vite
      compilerOptions.module = ts.ModuleKind.ESNext;
      compilerOptions.moduleResolution = ts.ModuleResolutionKind.Bundler;
    },

    transform(code, id) {
      // Only transform TypeScript files that match our patterns
      if (!id.endsWith(".ts") && !id.endsWith(".tsx")) {
        return null;
      }

      if (!shouldTransform(id)) {
        return null;
      }

      try {
        // Create a minimal program for the transformer
        const sourceFile = ts.createSourceFile(
          id,
          code,
          compilerOptions.target ?? ts.ScriptTarget.ES2022,
          true,
          id.endsWith(".tsx") ? ts.ScriptKind.TSX : ts.ScriptKind.TS
        );

        // Create a minimal compiler host
        const compilerHost: ts.CompilerHost = {
          getSourceFile: (fileName) => {
            if (fileName === id) {
              return sourceFile;
            }
            // For other files, try to read from disk
            if (existsSync(fileName)) {
              const content = readFileSync(fileName, "utf-8");
              return ts.createSourceFile(
                fileName,
                content,
                compilerOptions.target ?? ts.ScriptTarget.ES2022,
                true
              );
            }
            return undefined;
          },
          getDefaultLibFileName: () => "lib.d.ts",
          writeFile: () => {},
          getCurrentDirectory: () => config.root,
          getCanonicalFileName: (fileName) => fileName,
          useCaseSensitiveFileNames: () => true,
          getNewLine: () => "\n",
          fileExists: existsSync,
          readFile: (fileName) => {
            if (existsSync(fileName)) {
              return readFileSync(fileName, "utf-8");
            }
            return undefined;
          },
        };

        // Create program
        const program = ts.createProgram([id], compilerOptions, compilerHost);

        // Get the transformer factory
        const transformerFactory = createTransformer(program);

        // Transform the source file
        const result = ts.transform(sourceFile, [transformerFactory]);
        const transformedSourceFile = result.transformed[0];

        if (!transformedSourceFile) {
          result.dispose();
          return null;
        }

        // Print the transformed code
        const printer = ts.createPrinter({
          newLine: ts.NewLineKind.LineFeed,
        });

        const transformedCode = printer.printFile(transformedSourceFile as ts.SourceFile);
        result.dispose();

        // Now transpile the transformed TypeScript to JavaScript
        const transpileResult = ts.transpileModule(transformedCode, {
          compilerOptions: {
            ...compilerOptions,
            sourceMap: true,
            inlineSources: true,
          },
          fileName: id,
        });

        return {
          code: transpileResult.outputText,
          map: transpileResult.sourceMapText
            ? JSON.parse(transpileResult.sourceMapText)
            : null,
        };
      } catch (error) {
        console.error(`[conduct] Transform error in ${id}:`, error);
        // Return null to let Vite's default handling take over
        return null;
      }
    },
  };
}

export default conductVitePlugin;