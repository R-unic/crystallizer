import { readFileSync, readdirSync } from "fs";
import ts from "typescript";
import json5 from "json5";
import path from "path";

import Crystallizer from "./crystallizer";

export default class CLI {
  private readonly compilerOptions: ts.CompilerOptions;
  private readonly projectDir: string;

  public constructor(rootDirectory: string) {
    this.projectDir = path.join(__dirname, "../", rootDirectory);
    const tsconfigPath = path.join(this.projectDir, "tsconfig.json");
    const tsconfigJSON = readFileSync(tsconfigPath).toString();
    const tsconfig: { compilerOptions: ts.CompilerOptions } = json5.parse(tsconfigJSON);

    this.compilerOptions = tsconfig.compilerOptions ?? {};
    this.compilerOptions.strict = true;
    this.compilerOptions.noEmit = true;
    this.compilerOptions.rootDir ??= "src";
    this.compilerOptions.outDir ??= "dist";
  }

  public runAll(): void {
    const sourceFileNames = readdirSync(path.join(this.projectDir, this.compilerOptions.rootDir!));
    const sourceFiles: ts.SourceFile[] = [];
    for (const fileName of sourceFileNames) {
      const filePath = path.join("src", fileName);
      const contents = readFileSync(path.join(this.projectDir, filePath));
      const sourceFile = ts.createSourceFile(filePath, contents.toString(), ts.ScriptTarget.ES2015);
      sourceFiles.push(sourceFile);
    }

    const crystallizer = new Crystallizer(sourceFiles, this.compilerOptions, this.projectDir);
    crystallizer.compile();
  }
}