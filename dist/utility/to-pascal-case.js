"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
function toPascalCase(input) {
    const modifiedInput = input.replace(/[_\-]([a-z])/gi, (_, match) => match.toUpperCase());
    return modifiedInput.charAt(0).toUpperCase() + modifiedInput.slice(1);
}
exports.default = toPascalCase;
