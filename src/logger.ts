import ts from "typescript";
import "colors.ts";

export default class Log {
  public static error(
    sourceFile: ts.SourceFile,
    message: string,
    line: number,
    character: number,
    code: string,
    source?: string
  ): void {
    console.log(`\n${sourceFile.fileName.cyan}:${(line + 1).toString().yellow}:${(character + 1).toString().yellow} - ${"error".red} ${(code + ":").gray(7)} ${message}\n`);
    if (source) {
      const lineNumberText = (line + 1).toString();
      const lineSource = sourceFile.getFullText(sourceFile).split("\n")[line];
      console.log(`${(lineNumberText).gray(3).bg_white}\t${lineSource}`);
      console.log(`${" ".repeat(lineNumberText.length).bg_white}\t${" ".repeat(character)}` + "~".red) // red
    }
  }

  public static warning(message: string): void {
    // TODO: implement this lol
    console.warn(message);
  }
}