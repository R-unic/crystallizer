import { copyFileSync, mkdirSync, readdirSync, statSync } from "fs";
import isDirectory from "./is-directory";
import path from "path";

export default function copyDirectory(source: string, destination: string): void {
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