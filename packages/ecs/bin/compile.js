#!/usr/bin/env node

import { spawn } from "child_process";
import { existsSync, writeFileSync, unlinkSync, readFileSync } from "fs";
import { dirname, join, resolve } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));

// Path to the compiler relative to this script
const compilerPath = resolve(__dirname, "../dist/compiler.cjs");

// Working directory (where the command is run from)
const cwd = process.cwd();
const tsconfigPath = join(cwd, "tsconfig.json");
const tempTsconfigPath = join(cwd, "tsconfig.conduct.json");
const tempTsbuildInfoPath = join(cwd, "tsconfig.conduct.tsbuildinfo");

if (!existsSync(tsconfigPath)) {
  console.error("Error: tsconfig.json not found in", cwd);
  process.exit(1);
}

if (!existsSync(compilerPath)) {
  console.error("Error: compiler.cjs not found at", compilerPath);
  console.error("Run 'npm run build:compiler' in @conduct/ecs first");
  process.exit(1);
}

// Read existing tsconfig
const tsconfig = JSON.parse(readFileSync(tsconfigPath, "utf-8"));

// Merge in the plugin configuration
const mergedConfig = {
  ...tsconfig,
  compilerOptions: {
    ...tsconfig.compilerOptions,
    plugins: [
      ...(tsconfig.compilerOptions?.plugins || []),
      { transform: compilerPath },
    ],
  },
};

// Clean up any stale tsbuildinfo from previous runs
if (existsSync(tempTsbuildInfoPath)) {
  unlinkSync(tempTsbuildInfoPath);
}

// Write temporary tsconfig
writeFileSync(tempTsconfigPath, JSON.stringify(mergedConfig, null, 2));

// Find tsc - check local node_modules first, then ecs package
const localTsc = join(cwd, "node_modules", ".bin", "tsc");
const ecsTsc = join(__dirname, "../node_modules/.bin/tsc");
const tscPath = existsSync(localTsc) ? localTsc : ecsTsc;

// Run tsc with the temporary config
const child = spawn(tscPath, ["-p", tempTsconfigPath, ...process.argv.slice(2)], {
  cwd,
  stdio: "inherit",
  shell: process.platform === "win32",
});

function cleanup() {
  if (existsSync(tempTsconfigPath)) {
    unlinkSync(tempTsconfigPath);
  }
  if (existsSync(tempTsbuildInfoPath)) {
    unlinkSync(tempTsbuildInfoPath);
  }
}

child.on("close", (code) => {
  cleanup();
  process.exit(code || 0);
});

child.on("error", (err) => {
  console.error("Failed to run tsc:", err.message);
  cleanup();
  process.exit(1);
});