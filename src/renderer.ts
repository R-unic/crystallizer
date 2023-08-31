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
  TypeNode,
  ArrayLiteralExpression,
  ArrayTypeNode,
  TypeAliasDeclaration,
  ModifierLike,
  TypeReferenceNode
} from "typescript";
import Log from "./logger";
import Util from "./utility";
import TYPE_MAP from "./type-map";

const UNDECLARABLE_TYPE_NAMES = ["i32", "f32", "u32", "i64", "f64", "u64"];
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
        this.append(isTypeIdent ? this.getMappedType(text) : text);
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
          this.walkModifier(modifier);

        this.walk(statement.declarationList);
        break;
      }

      case SyntaxKind.TypeAliasDeclaration: {
        const alias = <TypeAliasDeclaration>node;
        if (UNDECLARABLE_TYPE_NAMES.includes(alias.name.getText(this.sourceNode)))
          break;

        for (const modifier of alias.modifiers ?? [])
          this.walkModifier(modifier);

        this.append("alias ");
        this.walk(alias.name);
        this.append(" = ");
        this.walkType(alias.type)
        this.append(";");
        this.newLine();
        break;
      }

      case SyntaxKind.ArrayLiteralExpression: {
        const array = <ArrayLiteralExpression>node;
        this.append("[");
        for (const element of array.elements) {
          this.walk(element);
          if (array.elements.indexOf(element) !== array.elements.length - 1)
            this.append(", ");
        }

        this.append("]");
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
        Log.error(`Unhandled AST syntax: ${Util.getSyntaxName(node.kind)}`);
        process.exit(1);
      }
    }
  }

  private walkModifier(modifier: ModifierLike): void {
    switch(modifier.kind) {
      case SyntaxKind.DeclareKeyword: {
        break;
      }
      default: {
        Log.error(`Unhandled modifier: ${Util.getSyntaxName(modifier.kind)}`);
        process.exit(1);
      }
    }
  }

  private walkType(type: TypeNode): void {
    switch(type.kind) {
      case SyntaxKind.ArrayType: {
        const arrayType = <ArrayTypeNode>type;
        this.append("Array(");
        this.walkType(arrayType.elementType);
        this.append(")");
        break;
      }
      case SyntaxKind.NumberKeyword: {
        this.append("Float");
        break;
      }
      case SyntaxKind.StringKeyword: {
        this.append("String");
        break;
      }
      case SyntaxKind.BooleanKeyword: {
        this.append("Bool");
        break;
      }
      case SyntaxKind.TypeReference: {
        const ref = <TypeReferenceNode>type;
        this.append(this.getMappedType(ref.typeName.getText(this.sourceNode)));
        if (ref.typeArguments) {
          this.append("(");
          for (const typeArg of ref.typeArguments) {
            this.walk(typeArg);
            if (ref.typeArguments.indexOf(typeArg) !== ref.typeArguments.length - 1)
              this.append(", ");
          }
          this.append(")");
        }

        break;
      }
      case SyntaxKind.TypeKeyword: {
        this.append(this.getMappedType(type.getText(this.sourceNode)));
        break;
      }
      default: {
        Log.error(`Unhandled type node: ${Util.getSyntaxName(type.kind)}`);
        process.exit(1);
      }
    }
  }

  private walkChildren(node: Node): void {
    for (const child of node.getChildren())
      this.walk(child);
  }

  private walkFlag(flag: NodeFlags): void {
    if (flag == NodeFlags.Const) return; // don't worry abt constants
    this.flags.push(NodeFlags[flag]);
  }

  private getMappedType(text: string): string {
    let [ typeName, genericList ] = text.replace(">", "").split("<", 1);
    const generics = (genericList ?? "")
      .split(",")
      .map(s => s.trim())
      .filter(s => s !== "");

    typeName = typeName.trim();
    let mappedType = TYPE_MAP.get(typeName) ?? typeName;
    if (generics.length > 0) {
      mappedType += "("
      mappedType += generics.join(", ");
      mappedType += ")"
    }

    return mappedType;
  }

  private consumeFlag(flag: string): boolean {
    const lastFlag = this.flags[this.flags.length - 1];
    const matched = flag == lastFlag;
    if (matched)
      this.flags.pop();

    return matched;
  }

  private lastGenerated(): string {
    return this.generated[this.generated.length - 1];
  }

  private newLine(): void {
    this.append("\n");
  }

  private append(...strings: string[]): void {
    this.generated.push(...strings);
  }
}