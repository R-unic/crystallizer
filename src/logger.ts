import ts from "typescript";

export default class Log {
  public static error(
    sourceFile: ts.SourceFile,
    message: string,
    line: number,
    character: number,
    code: string,
    source?: string
  ): void {

    // TODO: add *colors* :D
    /*
    cyan     yellow        red   hidden
    fileName:line:column - error TS1234: Type 'number' is not assignable to type 'string'.
    */
    console.log(`\n${sourceFile.fileName}:${line + 1}:${character + 1} - error ${code}: ${message}\n`);
    // foreground white background black for line & lineDigitLength space
    if (source) {
      const lineDigitLength = (line + 1).toString().length;
      const lineSource = sourceFile.getText(sourceFile).split("\n")[line];
      console.log(`${line + 1}\t${lineSource}`);
      console.log(`${" ".repeat(lineDigitLength)}\t${" ".repeat(character)}~`) // red
    }
  }

  public static warning(message: string): void {
    // TODO: implement this lol
    console.warn(message);
  }
}