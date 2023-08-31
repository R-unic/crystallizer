import { readFileSync, readdirSync } from "fs";
import * as ts from "typescript";
import path from "path";
import * as json5 from "json5";

import Crystallizer from "./compiler";

const projectDir = path.join(__dirname, "../", process.argv[2] ?? process.cwd());
const tsconfigPath = path.join(projectDir, "./tsconfig.json");
const tsconfigJSON = readFileSync(tsconfigPath).toString();
const tsconfig: { compilerOptions: ts.CompilerOptions } = json5.parse(tsconfigJSON);

// add config and such
// and remove file option
// cli parsing
const compilerOptions = tsconfig.compilerOptions ?? {};
compilerOptions.strict = true;
compilerOptions.noEmit = true;
compilerOptions.rootDir ??= "src";
compilerOptions.outDir ??= "dist";

const sourceFileNames = readdirSync(path.join(projectDir, compilerOptions.rootDir));
const sourceFiles: ts.SourceFile[] = [];
for (const fileName of sourceFileNames) {
  const filePath = path.join("src", fileName);
  const contents = readFileSync(path.join(projectDir, filePath));
  const sourceFile = ts.createSourceFile(filePath, contents.toString(), ts.ScriptTarget.ES2015);
  sourceFiles.push(sourceFile);
}

const crystallizer = new Crystallizer(sourceFiles, compilerOptions, projectDir);
crystallizer.compile();