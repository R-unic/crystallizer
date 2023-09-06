import { writeFileSync, rmSync } from "fs";
import { exec } from "child_process";
import { platform } from "os";

import {
  CompilerOptions, Program, SourceFile,
  createCompilerHost,
  createProgram,
  flattenDiagnosticMessageText,
  getLineAndCharacterOfPosition,
  getPreEmitDiagnostics
} from "typescript";
import path from "path";

import Util from "./utility";
import Log from "./logger";
import CodeGenerator from "./code-generator";

const TYPE_HELPER_FILENAME = "crystal.d.ts";

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
    this.copyRuntimeLib();

    const fileNames = this.sourceFiles.map(source => path.join(this.projectDir, source.fileName));
    const host = createCompilerHost(this.compilerOptions);
    const program = createProgram(fileNames, this.compilerOptions, host);
    this.handleDiagnostics(program);

    for (const sourceFile of this.sourceFiles)
      this.compileFile(sourceFile);
  }

  private compileFile(sourceFile: SourceFile): void {
    // don't compile crystal.d.ts
    if (sourceFile.fileName.endsWith(TYPE_HELPER_FILENAME)) return;

    const codeGen = new CodeGenerator(sourceFile);
    const compiledCode = codeGen.generate();
    const outPath = sourceFile.fileName
      .replace(this.sourceDirName, this.outDirName)
      .replace(".ts", ".cr");

    console.log(compiledCode);
    writeFileSync(path.join(this.projectDir, outPath), compiledCode);
  }

  private copyRuntimeLib(): void {
    const projectRuntimeLibPath = path.join(this.compilerOptions.outDir!, "runtime_lib");
    if (Util.Files.isDirectory(projectRuntimeLibPath)) {
      const rf = {
        force: true,
        recursive: true
      };

      rmSync(projectRuntimeLibPath, rf);
      rmSync(path.join(projectRuntimeLibPath, "lib"), rf);
      rmSync(path.join(projectRuntimeLibPath, "spec"), rf);
      rmSync(path.join(projectRuntimeLibPath, "shard.lock"), rf);
    }

    Util.Files.copyDirectory(path.join(__dirname, "../runtime_lib"), projectRuntimeLibPath);

    const runtimeLibShard = path.join(projectRuntimeLibPath, "shard.yml");
    const crystalTypeHelpers = path.join(projectRuntimeLibPath, TYPE_HELPER_FILENAME)
    Util.Files.moveFile(runtimeLibShard, path.join(this.compilerOptions.outDir!, "shard.yml"));
    Util.Files.moveFile(crystalTypeHelpers, path.join(this.compilerOptions.outDir!, TYPE_HELPER_FILENAME));

    const isWindows = platform() === "win32";
    exec((isWindows ? "where.exe" : "which") + " shards", (error, stdout, stderr) => {
      if (error || stderr)
        return console.error(`Error: ${error?.message ? error.message + stderr : stderr}`);

      const outParts = stdout.split("shards: ");
      const shardsExecutable = outParts[outParts.length - 1].trim();
      exec(`"${path.resolve(shardsExecutable)}" install`, { cwd: this.compilerOptions.outDir }, (error, _, stderr) => {
        if (error || stderr)
          return console.error(`Error: ${error?.message ? error.message + stderr : stderr}`);
      });
    })
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