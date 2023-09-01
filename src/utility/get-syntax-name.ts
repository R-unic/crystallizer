import { SyntaxKind } from "typescript";

export default function getSyntaxName(kind: SyntaxKind): string {
  return SyntaxKind[kind];
}