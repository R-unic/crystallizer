import {
  SourceFile,
  Node, NodeFlags,
  SyntaxKind,
  VariableDeclaration,
  VariableStatement,
  VariableDeclarationList,
  Identifier,
  QualifiedName,
  LiteralLikeNode,
  StringLiteral,
  TypeNode
} from "typescript";
import Log from "./logger";
import Util from "./utility";
import TYPE_MAP from "./type-map";

export default class CrystalRenderer {
  private generated: string[] = [];
  private flags: string[] = [];

  public constructor(
    private readonly sourceNode: SourceFile
  ) {}

  public render(): string {
    this.walkChildren(this.sourceNode);
    return this.generated.join("").trim();
  }

  private walk(node: Node): void {
    switch(node.kind) {
      case SyntaxKind.QualifiedName: {
        const { left, right } = <QualifiedName>node;
        this.walk(left);
        this.append(".");
        this.walk(right);
        break
      }
      case SyntaxKind.Identifier: {
        const isTypeIdent = this.consumeFlag("TypeIdent");
        const { text } = <Identifier>node;
        if (isTypeIdent)
          this.append(this.getMappedType(text));
        else {
          const isConst = this.consumeFlag("Const");
          this.append(isConst ? text.toUpperCase() : text);
        }
        break;
      }
      case SyntaxKind.VariableDeclaration: {
        const declaration = <VariableDeclaration>node;
        this.walk(declaration.name);

        if (declaration.type) {
          this.append(" : ");
          this.walkType(declaration.type)
        }
        if (declaration.initializer) {
          this.append(" = ");
          this.walk(declaration.initializer);
        }

        this.newLine();
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
        this.append(`"${(<StringLiteral>node).text}"`);
        break;
      }
      case SyntaxKind.TrueKeyword: {
        this.append("true");
        break;
      }
      case SyntaxKind.FalseKeyword: {
        this.append("true");
        break;
      }
      case SyntaxKind.FirstLiteralToken: {
        this.append((<LiteralLikeNode>node).text);
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
        Log.warning(`Unhandled AST syntax: ${Util.getSyntaxName(node.kind)}`);
        break;
      }
    }
  }

  private newLine(): void {
    this.append("\n");
  }

  private append(...strings: string[]): void {
    this.generated.push(...strings);
  }

  private getMappedType(text: string): string {
    return TYPE_MAP.get(text) ?? text;
  }

  private walkType(type: TypeNode): void {
    switch(type.kind) {
      case SyntaxKind.StringKeyword: {
        this.append("String");
        break;
      }
      case SyntaxKind.BooleanKeyword: {
        this.append("Bool");
        break;
      }
      case SyntaxKind.TypeKeyword: {
        this.append(this.getMappedType(type.getText(this.sourceNode)));
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