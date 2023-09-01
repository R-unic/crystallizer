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

  public static isNotLast<T = unknown>(element: T, array: ArrayLike<T> & { indexOf(e: T): number; }): boolean {
    return array.indexOf(element) !== array.length - 1
  }

  public static prettyPrintNode(node?: Node): void {
    if (!node) return;
    console.log(`${SyntaxKind[node.kind]}`, node);
  }

  public static getSyntaxName(kind: SyntaxKind): string {
    return SyntaxKind[kind];
  }
}