"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
class StringBuilder {
    constructor() {
        this.indentation = 0;
        this.parts = [];
    }
    get generated() {
        return this.parts.join("");
    }
    append(...strings) {
        this.parts.push(...strings);
    }
    peekLastPart() {
        return this.parts[this.parts.length - 1];
    }
    popLastPart() {
        return this.parts.pop();
    }
    pushIndentation() {
        this.indentation++;
    }
    popIndentation() {
        this.indentation--;
    }
    newLine() {
        this.append("\n" + "    ".repeat(this.indentation));
    }
}
exports.default = StringBuilder;
