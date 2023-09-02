"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const tslib_1 = require("tslib");
const fs_1 = require("fs");
const typescript_1 = tslib_1.__importDefault(require("typescript"));
const json5_1 = tslib_1.__importDefault(require("json5"));
const path_1 = tslib_1.__importDefault(require("path"));
const utility_1 = tslib_1.__importDefault(require("./utility"));
const crystallizer_1 = tslib_1.__importDefault(require("./crystallizer"));
class CLI {
    constructor(rootDirectory) {
        var _a, _b;
        this.projectDir = path_1.default.join(__dirname, "../", rootDirectory);
        const tsconfigPath = path_1.default.join(this.projectDir, "tsconfig.json");
        const tsconfigJSON = (0, fs_1.readFileSync)(tsconfigPath).toString();
        const tsconfig = json5_1.default.parse(tsconfigJSON);
        this.compilerOptions = tsconfig.compilerOptions ?? {};
        this.compilerOptions.strict = true;
        this.compilerOptions.noEmit = true;
        (_a = this.compilerOptions).rootDir ?? (_a.rootDir = "src");
        (_b = this.compilerOptions).outDir ?? (_b.outDir = "dist");
    }
    runAll() {
        const sourceFileNames = (0, fs_1.readdirSync)(path_1.default.join(this.projectDir, this.compilerOptions.rootDir));
        const sourceFiles = this.getSourceFiles(sourceFileNames);
        const crystallizer = new crystallizer_1.default(sourceFiles, this.compilerOptions, this.projectDir);
        crystallizer.compile();
    }
    getSourceFiles(fileNames) {
        const sourceFiles = [];
        for (const fileName of fileNames) {
            const filePath = path_1.default.join(this.compilerOptions.rootDir, fileName);
            if (utility_1.default.Files.isDirectory(filePath)) {
                const childFileNames = (0, fs_1.readdirSync)(filePath);
                sourceFiles.push(...childFileNames.map(fileName => this.createSourceFile(path_1.default.join(filePath, fileName))));
            }
            else
                sourceFiles.push(this.createSourceFile(filePath));
        }
        return sourceFiles;
    }
    createSourceFile(filePath) {
        const contents = (0, fs_1.readFileSync)(path_1.default.join(this.projectDir, filePath));
        return typescript_1.default.createSourceFile(filePath, contents.toString(), typescript_1.default.ScriptTarget.ES2015);
    }
}
exports.default = CLI;
