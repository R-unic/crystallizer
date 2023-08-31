import { SyntaxKind, Node } from "typescript";
import Log from "./logger";

export default class Util {
  public static syntaxKindToText(kind: SyntaxKind) {
    switch(kind) {
      case SyntaxKind.PlusToken:
        return "+";

      default: {
        Log.error(`Unhandled syntax kind to text conversion: ${Util.getSyntaxName(kind)}`);
        process.exit(1);
      }
    }
  }
  public static prettyPrintNode(node?: Node): void {
    if (!node) return;
    console.log(`${SyntaxKind[node.kind]}`, node);
  }

  public static getSyntaxName(kind: SyntaxKind): string {
    return SyntaxKind[kind];
  }
}