import { SourceFile, Node, SyntaxKind, VariableDeclaration, SyntaxList, Statement, DeclarationStatement, VariableStatement, VariableDeclarationList, Identifier, LiteralLikeNode, NodeFlags, StringLiteral, TypeNode, TypeReference, TypeReferenceNode, QualifiedName } from "typescript";
import Log from "./logger";
import TYPE_MAP from "./type-map";

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
      case SyntaxKind.QualifiedName: {
        const { left, right } = <QualifiedName>node;
        this.walk(left);
        this.generated.push(".");
        this.walk(right);
        break
      }
      case SyntaxKind.Identifier: {
        const isTypeIdent = this.consumeFlag("TypeIdent");
        const { text } = <Identifier>node;
        if (isTypeIdent)
          this.generated.push(this.getMappedType(text));
        else {
          const isConst = this.consumeFlag("Const");
          this.generated.push(isConst ? text.toUpperCase() : text);
        }
        break;
      }
      case SyntaxKind.VariableDeclaration: {
        const declaration = <VariableDeclaration>node;
        this.walk(declaration.name);

        // TODO: handle type nodes
        if (declaration.type) {
          this.generated.push(" : ");
          console.log(getSyntaxName(declaration.type.kind));
          this.walkType(declaration.type)
        }
        if (declaration.initializer) {
          this.generated.push(" = ");
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

  private getMappedType(text: string): string {
    return TYPE_MAP.get(text) ?? text;
  }

  private walkType(type: TypeNode): void {
    switch(type.kind) {
      case SyntaxKind.StringKeyword: {
        this.generated.push("String");
        break;
      }
      case SyntaxKind.BooleanKeyword: {
        this.generated.push("Bool");
        break;
      }
      case SyntaxKind.TypeKeyword: {
        this.generated.push(this.getMappedType(type.getText(this.sourceNode)));
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
