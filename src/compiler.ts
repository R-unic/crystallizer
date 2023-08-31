import { SourceFile, Node, SyntaxKind, VariableDeclaration, SyntaxList, Statement, DeclarationStatement, VariableStatement, VariableDeclarationList, Identifier, LiteralLikeNode, NodeFlags, StringLiteral } from "typescript";
import Log from "./logger";

function prettyPrintNode(node: Node): void {
  console.log(`${SyntaxKind[node.kind]}`, node);
}

export default class Crystallizer {
  private generated: string[] = [];
  private flags: string[] = [];

  public constructor(
    private readonly sourceNode: SourceFile
  ) {}

  public compile(): void {
    for (const node of this.sourceNode.getChildren())
      this.walk(node);

    console.log(this.generated.join(""));
  }

  private walk(node: Node): void {
    switch(node.kind) {
      case SyntaxKind.Identifier: {
        const isConst = this.consumeFlag("Const");
        const { text } = <Identifier>node;
        this.generated.push(isConst ? text.toUpperCase() : text);
        break
      }
      case SyntaxKind.VariableDeclaration: {
        const declaration = <VariableDeclaration>node;
        this.walk(declaration.name);

        // TODO: handle type nodes
        if (declaration.initializer) {
          this.generated.push(" = ")
          this.walk(declaration.initializer);
        }
        break;
      }
      case SyntaxKind.VariableDeclarationList: {
        const declarationList = <VariableDeclarationList>node;
        this.walkFlag(declarationList.flags);
        for (const declaration of declarationList.declarations)
          this.walk(declaration);

        break;
      }

      case SyntaxKind.VariableStatement: {
        const statement = <VariableStatement>node;
        for (const modifier of statement.modifiers ?? [])
          this.walk(modifier);

        this.walk(statement.declarationList);
        break;
      }

      case SyntaxKind.StringLiteral: {
        this.generated.push(`"${(<StringLiteral>node).text}"`);
        break;
      }
      case SyntaxKind.TrueKeyword: {
        this.generated.push("true");
        break;
      }
      case SyntaxKind.FalseKeyword: {
        this.generated.push("true");
        break;
      }
      case SyntaxKind.FirstLiteralToken: {
        this.generated.push((<LiteralLikeNode>node).text);
        break;
      }
      case SyntaxKind.SyntaxList: {
        this.walkChildren(node);
        break;
      }

      case SyntaxKind.EndOfFileToken: {
        break;
      }

      default: {
        Log.warning(`Unhandled AST syntax: ${getSyntaxName(node.kind)}`);
        break;
      }
    }
  }

  private walkFlag(flag: NodeFlags): void {
    this.flags.push(NodeFlags[flag]);
  }

  private walkChildren(node: Node): void {
    for (const child of node.getChildren())
      this.walk(child);
  }

  private consumeFlag(flag: string): boolean {
    const lastFlag = this.flags[this.flags.length - 1];
    const matched = flag == lastFlag;
    if (matched)
      this.flags.pop();

    return matched;
  }

}

function getSyntaxName(kind: SyntaxKind): string {
  return SyntaxKind[kind];
}
