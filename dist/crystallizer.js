"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const tslib_1 = require("tslib");
const fs_1 = require("fs");
const typescript_1 = require("typescript");
const code_generator_1 = tslib_1.__importDefault(require("./code-generator"));
const logger_1 = tslib_1.__importDefault(require("./logger"));
const path_1 = tslib_1.__importDefault(require("path"));
class Crystallizer {
    constructor(sourceFiles, compilerOptions, projectDir) {
        this.sourceFiles = sourceFiles;
        this.compilerOptions = compilerOptions;
        this.projectDir = projectDir;
        this.sourceDirName = this.compilerOptions.rootDir
            .replace(this.projectDir, "")
            .replace("./", "");
        this.outDirName = this.compilerOptions.outDir
            .replace(this.projectDir, "")
            .replace("./", "");
        this.compilerOptions.rootDir = path_1.default.join(this.projectDir, compilerOptions.rootDir);
        this.compilerOptions.outDir = path_1.default.join(this.projectDir, compilerOptions.outDir);
    }
    compile() {
        const fileNames = this.sourceFiles.map(source => path_1.default.join(this.projectDir, source.fileName));
        const host = (0, typescript_1.createCompilerHost)(this.compilerOptions);
        const program = (0, typescript_1.createProgram)(fileNames, this.compilerOptions, host);
        this.handleDiagnostics(program);
        for (const sourceFile of this.sourceFiles)
            this.compileFile(sourceFile);
    }
    compileFile(sourceFile) {
        const codeGen = new code_generator_1.default(sourceFile, { outDir: this.compilerOptions.outDir });
        const compiledCode = codeGen.generate();
        const outPath = sourceFile.fileName
            .replace(this.sourceDirName, this.outDirName)
            .replace(".ts", ".cr");
        if (outPath.endsWith(".d.cr"))
            return;
        console.log(compiledCode);
        (0, fs_1.writeFileSync)(path_1.default.join(this.projectDir, outPath), compiledCode);
    }
    handleDiagnostics(program) {
        const emitResult = program.emit();
        const allDiagnostics = (0, typescript_1.getPreEmitDiagnostics)(program).concat(emitResult.diagnostics);
        for (const diagnostic of allDiagnostics)
            if (diagnostic.file) {
                const { line, character } = (0, typescript_1.getLineAndCharacterOfPosition)(diagnostic.file, diagnostic.start);
                const message = (0, typescript_1.flattenDiagnosticMessageText)(diagnostic.messageText, "\n");
                logger_1.default.error(diagnostic.file, message, line, character, `TS${diagnostic.code}`, diagnostic.source);
            }
            else
                console.log((0, typescript_1.flattenDiagnosticMessageText)(diagnostic.messageText, "\n"));
        if (emitResult.emitSkipped || allDiagnostics.length > 0)
            process.exit(1);
    }
}
exports.default = Crystallizer;
