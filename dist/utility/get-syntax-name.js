"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const typescript_1 = require("typescript");
function getSyntaxName(kind) {
    return typescript_1.SyntaxKind[kind];
}
exports.default = getSyntaxName;
