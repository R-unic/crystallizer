"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const tslib_1 = require("tslib");
const path_1 = tslib_1.__importDefault(require("path"));
const cli_1 = tslib_1.__importDefault(require("./cli"));
const cli = new cli_1.default(process.argv[2] ?? path_1.default.relative(path_1.default.dirname(__dirname), process.cwd()));
cli.runAll();
