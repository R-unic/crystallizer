"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
function toSnakeCase(input) {
    return input.replace(/([a-z])([A-Z])/g, '$1_$2').toLowerCase();
}
exports.default = toSnakeCase;
