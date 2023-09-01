import { Node, SyntaxKind } from "typescript";

export default function prettyPrintNode(node?: Node): void {
  // this doesn't really do shit lol
  if (!node) return;
  console.log(`${SyntaxKind[node.kind]}`, node);
}