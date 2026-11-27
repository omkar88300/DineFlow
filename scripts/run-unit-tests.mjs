import { spawnSync } from "node:child_process";
import {
  existsSync,
  readFileSync,
  readdirSync,
  rmSync,
} from "node:fs";
import path from "node:path";

const root = process.cwd();
const testsRoot = path.join(root, "tests");
const libRoot = path.join(root, "lib");
const outputRoot = path.join(root, ".test-build");
const compilerPath = path.join(
  root,
  "node_modules",
  "typescript",
  "bin",
  "tsc"
);

function collectFiles(directory, predicate, files = []) {
  if (!existsSync(directory)) return files;

  for (const entry of readdirSync(directory, { withFileTypes: true })) {
    const fullPath = path.join(directory, entry.name);
    if (entry.isDirectory()) {
      collectFiles(fullPath, predicate, files);
    } else if (entry.isFile() && predicate(entry.name)) {
      files.push(fullPath);
    }
  }

  return files;
}

function run() {
  const testFiles = collectFiles(
    testsRoot,
    (name) => name.endsWith(".test.mjs")
  ).sort();

  if (testFiles.length === 0) {
    console.log("No Node.js test files found.");
    return;
  }

  const sourceFiles = new Set();
  const compiledImport =
    /(?:from\s+|import\s*)["']\.\.\/\.test-build\/([^"']+)\.js["']/g;

  for (const testFile of testFiles) {
    const source = readFileSync(testFile, "utf8");
    for (const match of source.matchAll(compiledImport)) {
      const sourcePath = path.resolve(libRoot, match[1] + ".ts");
      if (!sourcePath.startsWith(libRoot + path.sep)) {
        throw new Error("Invalid compiled-module path in " + testFile + ".");
      }
      if (!existsSync(sourcePath)) {
        throw new Error(
          "Test " + path.relative(root, testFile) +
          " imports a compiled module whose source is missing: " +
          path.relative(root, sourcePath)
        );
      }
      sourceFiles.add(sourcePath);
    }
  }

  rmSync(outputRoot, { recursive: true, force: true });

  if (sourceFiles.size > 0) {
    if (!existsSync(compilerPath)) {
      throw new Error("TypeScript is not installed. Run npm ci before testing.");
    }

    const compile = spawnSync(
      process.execPath,
      [
        compilerPath,
        "--target", "ES2020",
        "--module", "commonjs",
        "--strict",
        "--rootDir", libRoot,
        "--outDir", outputRoot,
        ...[...sourceFiles].sort(),
      ],
      { stdio: "inherit" }
    );

    if (compile.error) throw compile.error;
    if (compile.status !== 0) {
      process.exitCode = compile.status ?? 1;
      return;
    }
  }

  const tests = spawnSync(process.execPath, ["--test", ...testFiles], {
    stdio: "inherit",
  });
  if (tests.error) throw tests.error;
  process.exitCode = tests.status ?? 1;
}

try {
  run();
} catch (error) {
  console.error(error instanceof Error ? error.message : "Unit test runner failed.");
  process.exitCode = 1;
}
