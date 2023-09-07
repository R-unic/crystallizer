import { readFileSync, readdirSync, rmSync } from "fs";
import ts from "typescript";
import json5 from "json5";
import path from "path";

import Util from "./utility";
import Constants from "./constants";
import Crystallizer from "./crystallizer";
import { exec } from "child_process";
import { platform } from "os";

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
    this.copyRuntimeLib();
    const sourceFileNames = readdirSync(path.join(this.projectDir, this.compilerOptions.rootDir!));
    const sourceFiles: ts.SourceFile[] = this.getSourceFiles(sourceFileNames);
    const crystallizer = new Crystallizer(sourceFiles, this.compilerOptions, this.projectDir);
    crystallizer.compile();
  }

  private copyRuntimeLib(): void {
    const fullOutDir = path.join(this.projectDir, this.compilerOptions.outDir!);
    const fullRootDir = path.join(this.projectDir, this.compilerOptions.rootDir!);
    const projectRuntimeLibPath = path.join(fullOutDir, "runtime_lib");
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
    const crystalTypeHelpers = path.join(projectRuntimeLibPath, Constants.TYPE_HELPER_FILENAME);
    Util.Files.moveFile(runtimeLibShard, path.join(fullOutDir, "shard.yml"));
    Util.Files.moveFile(crystalTypeHelpers, path.join(fullRootDir, Constants.TYPE_HELPER_FILENAME));

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

  private getSourceFiles(fileNames: string[]): ts.SourceFile[] {
    const sourceFiles: ts.SourceFile[] = [];
    for (const fileName of fileNames) {
      const filePath = path.join(this.compilerOptions.rootDir!, fileName);
      if (!filePath.endsWith(".ts")) continue;

      if (Util.Files.isDirectory(filePath)) {
        const childFileNames = readdirSync(filePath);
        sourceFiles.push(...childFileNames.map(fileName => this.createSourceFile(path.join(filePath, fileName))));
      } else
        sourceFiles.push(this.createSourceFile(filePath));
    }
    return sourceFiles;
  }

  private createSourceFile(filePath: string): ts.SourceFile {
    const contents = readFileSync(path.join(this.projectDir, filePath));
    return ts.createSourceFile(filePath, contents.toString(), ts.ScriptTarget.ES2015);
  }
}