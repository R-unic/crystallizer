"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
require("colors.ts");
class Log {
    static error(sourceFile, message, line, character, code, source) {
        console.log(`\n${sourceFile.fileName.cyan}:${(line + 1).toString().yellow}:${(character + 1).toString().yellow} - ${"error".red} ${(code + ":").gray(7)} ${message}\n`);
        if (source) {
            const lineNumberText = (line + 1).toString();
            const lineSource = sourceFile.getText(sourceFile).split("\n")[line];
            console.log(`${(lineNumberText).gray(3).bg_white}\t${lineSource}`);
            console.log(`${" ".repeat(lineNumberText.length).bg_white}\t${" ".repeat(character)}` + "~".red);
        }
    }
    static warning(message) {
        console.warn(message);
    }
}
exports.default = Log;
