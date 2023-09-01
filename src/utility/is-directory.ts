import fs from "fs";

export default function isDirectory(path: string): boolean {
  try {
    const stats = fs.statSync(path);
    return stats.isDirectory();
  } catch (err) {
    return false;
  }
}