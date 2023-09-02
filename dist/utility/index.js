"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const tslib_1 = require("tslib");
const get_syntax_name_1 = tslib_1.__importDefault(require("./get-syntax-name"));
const syntax_kind_to_text_1 = tslib_1.__importDefault(require("./syntax-kind-to-text"));
const is_not_last_1 = tslib_1.__importDefault(require("./is-not-last"));
const to_pascal_case_1 = tslib_1.__importDefault(require("./to-pascal-case"));
const pretty_print_node_1 = tslib_1.__importDefault(require("./pretty-print-node"));
const to_snake_case_1 = tslib_1.__importDefault(require("./to-snake-case"));
const files_1 = tslib_1.__importDefault(require("./files"));
exports.default = {
    getSyntaxName: get_syntax_name_1.default,
    syntaxKindToText: syntax_kind_to_text_1.default,
    isNotLast: is_not_last_1.default,
    toPascalCase: to_pascal_case_1.default,
    toSnakeCase: to_snake_case_1.default,
    prettyPrintNode: pretty_print_node_1.default,
    Files: files_1.default
};
