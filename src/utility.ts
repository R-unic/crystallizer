import { SyntaxKind, Node } from "typescript";

export default class Util {
  public static syntaxKindToText(kind: SyntaxKind): string {
    switch(kind) {
      case SyntaxKind.PlusToken:
        return "+";
      case SyntaxKind.MinusToken:
        return "-";
      case SyntaxKind.ExclamationToken:
        return "!";

      default:
        throw new Error(`Unhandled syntax kind to text conversion: ${Util.getSyntaxName(kind)}`);
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