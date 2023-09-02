"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const tslib_1 = require("tslib");
const typescript_1 = require("typescript");
const get_syntax_name_1 = tslib_1.__importDefault(require("./get-syntax-name"));
function syntaxKindToText(kind) {
    switch (kind) {
        case typescript_1.SyntaxKind.PlusToken:
            return "+";
        case typescript_1.SyntaxKind.MinusToken:
            return "-";
        case typescript_1.SyntaxKind.ExclamationToken:
            return "!";
        default:
            throw new Error(`Unhandled syntax kind to text conversion: ${(0, get_syntax_name_1.default)(kind)}`);
    }
}
exports.default = syntaxKindToText;
