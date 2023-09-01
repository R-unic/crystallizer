import { PathLike, copyFileSync, mkdirSync, readdirSync, rmSync, statSync } from "fs";
import path from "path";

namespace Files {
  export function moveFile(from: PathLike, to: PathLike) {
    copyFileSync(from, to);
    rmSync(from);
  }

  export function isDirectory(path: string): boolean {
    try {
      const stats = statSync(path);
      return stats.isDirectory();
    } catch (err) {
      return false;
    }
  }

  export function copyDirectory(source: string, destination: string): void {
    if (!isDirectory(destination))
      mkdirSync(destination);

    const files = readdirSync(source);
    for (const item of files) {
      const sourcePath = path.join(source, item);
      const destPath = path.join(destination, item);
      const stats = statSync(sourcePath);
      if (stats.isFile())
        copyFileSync(sourcePath, destPath);
      else if (stats.isDirectory())
        copyDirectory(sourcePath, destPath);
    }
  }
}

export default Files;