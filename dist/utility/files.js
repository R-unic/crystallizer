"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const tslib_1 = require("tslib");
const fs_1 = require("fs");
const path_1 = tslib_1.__importDefault(require("path"));
var Files;
(function (Files) {
    function moveFile(from, to) {
        (0, fs_1.copyFileSync)(from, to);
        (0, fs_1.rmSync)(from);
    }
    Files.moveFile = moveFile;
    function isDirectory(path) {
        try {
            const stats = (0, fs_1.statSync)(path);
            return stats.isDirectory();
        }
        catch (err) {
            return false;
        }
    }
    Files.isDirectory = isDirectory;
    function copyDirectory(source, destination) {
        if (!isDirectory(destination))
            (0, fs_1.mkdirSync)(destination);
        const files = (0, fs_1.readdirSync)(source);
        for (const item of files) {
            const sourcePath = path_1.default.join(source, item);
            const destPath = path_1.default.join(destination, item);
            const stats = (0, fs_1.statSync)(sourcePath);
            if (stats.isFile())
                (0, fs_1.copyFileSync)(sourcePath, destPath);
            else if (stats.isDirectory())
                copyDirectory(sourcePath, destPath);
        }
    }
    Files.copyDirectory = copyDirectory;
})(Files || (Files = {}));
exports.default = Files;
