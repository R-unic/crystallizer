import { SyntaxKind, Node } from "typescript";

export default class Util {
  public static prettyPrintNode(node?: Node): void {
    if (!node) return;
    console.log(`${SyntaxKind[node.kind]}`, node);
  }

  public static getSyntaxName(kind: SyntaxKind): string {
    return SyntaxKind[kind];
  }
}