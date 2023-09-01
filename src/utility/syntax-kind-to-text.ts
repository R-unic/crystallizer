import { SyntaxKind } from "typescript";
import getSyntaxName from "./get-syntax-name";

export default function syntaxKindToText(kind: SyntaxKind): string {
  switch(kind) {
    case SyntaxKind.PlusToken:
      return "+";
    case SyntaxKind.MinusToken:
      return "-";
    case SyntaxKind.ExclamationToken:
      return "!";

    default:
      throw new Error(`Unhandled syntax kind to text conversion: ${getSyntaxName(kind)}`);
  }
}