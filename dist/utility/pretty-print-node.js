"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const typescript_1 = require("typescript");
function prettyPrintNode(node) {
    if (!node)
        return;
    console.log(`${typescript_1.SyntaxKind[node.kind]}`, node);
}
exports.default = prettyPrintNode;
