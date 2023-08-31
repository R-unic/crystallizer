import { SyntaxKind, Node } from "typescript";

export default class Util {
  public static prettyPrintNode(node: Node): void {
    console.log(`${SyntaxKind[node.kind]}`, node);
  }
}