"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
function isNotLast(element, array) {
    return array.indexOf(element) !== array.length - 1;
}
exports.default = isNotLast;
