import { writeFileSync } from "fs";
import {
  createCompilerHost,
  createProgram,
  flattenDiagnosticMessageText,
  getLineAndCharacterOfPosition,
  getPreEmitDiagnostics
} from "typescript";
import type { CompilerOptions, Program, SourceFile } from "typescript";
import path from "path";

import Log from "./logger";
import CodeGenerator from "./code-generator";
import Constants from "./constants";

export default class Crystallizer {
  private readonly sourceDirName = this.compilerOptions.rootDir!
    .replace(this.projectDir, "")
    .replace("./", "");
  private readonly outDirName = this.compilerOptions.outDir!
    .replace(this.projectDir, "")
    .replace("./", "");

  public constructor(
    private readonly sourceFiles: SourceFile[],
    private readonly compilerOptions: CompilerOptions,
    private readonly projectDir: string
  ) {
    this.compilerOptions.rootDir = path.join(this.projectDir, compilerOptions.rootDir!);
    this.compilerOptions.outDir = path.join(this.projectDir, compilerOptions.outDir!);
  }

  public compile(): void {
    const fileNames = this.sourceFiles.map(source => path.join(this.projectDir, source.fileName));
    const host = createCompilerHost(this.compilerOptions);
    const program = createProgram(fileNames, this.compilerOptions, host);
    this.handleDiagnostics(program);

    for (const sourceFile of this.sourceFiles)
      this.compileFile(sourceFile);
  }

  private compileFile(sourceFile: SourceFile): void {
    // don't compile crystal.d.ts
    if (sourceFile.fileName.endsWith(Constants.TYPE_HELPER_FILENAME)) return;

    const codeGen = new CodeGenerator(sourceFile);
    const compiledCode = codeGen.generate();
    const outPath = sourceFile.fileName
      .replace(this.sourceDirName, this.outDirName)
      .replace(".ts", ".cr");

    console.log(compiledCode);
    writeFileSync(path.join(this.projectDir, outPath), compiledCode);
  }

  private handleDiagnostics(program: Program): void {
    const emitResult = program.emit();
    const allDiagnostics = getPreEmitDiagnostics(program).concat(emitResult.diagnostics);

    for (const diagnostic of allDiagnostics)
      if (diagnostic.file) {
        const { line, character } = getLineAndCharacterOfPosition(diagnostic.file, diagnostic.start!);
        const message = flattenDiagnosticMessageText(diagnostic.messageText, "\n");
        Log.error(
          diagnostic.file,
          message,
          line, character,
          `TS${diagnostic.code}`,
          diagnostic.source
        );
      } else
        console.log(flattenDiagnosticMessageText(diagnostic.messageText, "\n"));

    if (emitResult.emitSkipped || allDiagnostics.length > 0)
      process.exit(1);
  }
}