import { writeFileSync } from "fs";
import { CompilerOptions, Program, SourceFile, createCompilerHost, createProgram, flattenDiagnosticMessageText, getLineAndCharacterOfPosition, getPreEmitDiagnostics } from "typescript";
import CrystalRenderer from "./renderer";
import Log from "./logger";
import path from "path";

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
    const crystal = new CrystalRenderer(sourceFile);
    const compiledCode = crystal.render();
    const outPath = sourceFile.fileName
      .replace(this.sourceDirName, this.outDirName)
      .replace(".ts", ".cr");

    // no declarations
    if (outPath.endsWith(".d.cr")) return;
    console.log(compiledCode);
    writeFileSync(path.join(this.projectDir, outPath), compiledCode);
  }

  private handleDiagnostics(program: Program): void {
    // TODO: make this not dog shit lol
    // TODO: add *colors* :D
    const emitResult = program.emit();
    const allDiagnostics = getPreEmitDiagnostics(program).concat(emitResult.diagnostics);

    for (const diagnostic of allDiagnostics)
      if (diagnostic.file) {
        let { line, character } = getLineAndCharacterOfPosition(diagnostic.file, diagnostic.start!);
        let message = flattenDiagnosticMessageText(diagnostic.messageText, "\n");
        Log.error(`${diagnostic.file.fileName} (${line + 1},${character + 1}): ${message}`);
      } else
        console.log(flattenDiagnosticMessageText(diagnostic.messageText, "\n"));

    if (emitResult.emitSkipped || allDiagnostics.length > 0)
      process.exit(1);
  }
}