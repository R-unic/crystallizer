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
  TypeReferenceNode,
  getLineAndCharacterOfPosition,
  ObjectLiteralExpression,
  NodeArray,
  ObjectLiteralElementLike,
  FunctionDeclaration,
  ParameterDeclaration,
  ExpressionStatement,
  Block,
  ReturnStatement,
  CallExpression
} from "typescript";
import Log from "./logger";
import Util from "./utility";
import TYPE_MAP from "./type-map";

const UNDECLARABLE_TYPE_NAMES = ["i32", "f32", "u32", "i64", "f64", "u64"];
type MetaKey = "currentArrayType" | "currentHashKeyType" | "currentHashValueType";
interface MetaValues {
  currentArrayType?: string;
  currentHashKeyType?: string;
  currentHashValueType?: string;
}

export default class CrystalRenderer {
  private indentation = 0;

  private readonly generated: string[] = ["alias Num = Int64 | Int32 | Int16 | Int8 | Float64 | Float32 | Float16 | Float8 | UInt64 | UInt32 | UInt16 | UInt8\n"];
  private readonly flags: string[] = [];
  private readonly meta: Record<MetaKey, MetaValues[MetaKey]> = {
    currentArrayType: undefined,
    currentHashKeyType: undefined,
    currentHashValueType: undefined
  }

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
        this.walkModifiers(statement);
        this.walk(statement.declarationList);
        break;
      }

      case SyntaxKind.TypeAliasDeclaration: {
        const alias = <TypeAliasDeclaration>node;
        if (UNDECLARABLE_TYPE_NAMES.includes(alias.name.getText(this.sourceNode)))
          break;

        this.walkModifiers(alias);
        this.append("alias ");
        this.walk(alias.name);
        this.append(" = ");
        this.walkType(alias.type)
        this.newLine();
        break;
      }

      case SyntaxKind.CallExpression: {
        const call = <CallExpression>node;
        this.walk(call.expression);
        if (call.arguments.length > 0) {
          this.append("(");
          for (const arg of call.arguments) {
            this.walk(arg);
            if (this.isNotLast(arg, call.arguments))
              this.append(", ");
          }

          this.append(")");
        }
        break;
      }
      case SyntaxKind.ReturnStatement: {
        const statement = <ReturnStatement>node;
        this.append("return");
        if (statement.expression) {
          this.append(" ");
          this.walk(statement.expression);
        }

        break;
      }
      case SyntaxKind.Parameter: {
        const param = <ParameterDeclaration>node;
        this.walk(param.name);

        if (param.type) {
          this.append(" : ");
          this.walkType(param.type);
          if (param.questionToken)
            this.append("?");
        }

        if (param.initializer) {
          this.append(" = ");
          this.walk(param.initializer);
        }

        break;
      }
      case SyntaxKind.FunctionDeclaration: {
        // TODO: handle type parameters
        const declaration = <FunctionDeclaration>node;
        if (!declaration.name)
          return this.error(declaration, "Anonymous functions not supported yet.");

        this.append("def ")
        this.walk(declaration.name);

        if (declaration.parameters.length > 0) {
          this.append("(");
          for (const param of declaration.parameters)
            this.walk(param);
          this.append(")");
        }

        if (declaration.type) {
          this.append(" : ");
          this.walkType(declaration.type);
        }

        if (declaration.body)
          this.walk(declaration.body);

        this.newLine();
        this.append("end");
        this.newLine();
        break;
      }

      case SyntaxKind.ObjectLiteralExpression: {
        const object = <ObjectLiteralExpression>node;
        this.append("{");
        for (const property of object.properties) {
          const [ name, _, value ] = property.getChildren(this.sourceNode);

          if (name.kind == SyntaxKind.Identifier)
            this.append('"');
          this.walk(name);
          if (name.kind == SyntaxKind.Identifier)
            this.append('"');

          this.append(" => ");
          this.walk(value);
          if (this.isNotLast(property, object.properties))
            this.append(", ");
        }

        this.append("}");
        if (object.properties.length === 0) {
          if (!this.meta.currentHashKeyType || !this.meta.currentHashValueType)
            return this.error(object, "Empty objects must have a Record type annotation.");

          this.append(" of ");
          this.append(this.meta.currentHashKeyType);
          this.append(" => ");
          this.append(this.meta.currentHashValueType);
          this.resetMeta("currentHashKeyType");
          this.resetMeta("currentHashValueType");
        }

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
        if (array.elements.length === 0) {
          if (!this.meta.currentArrayType)
            return this.error(array, "Empty arrays must have a type annotation.");

          this.append(" of ");
          this.append(this.meta.currentArrayType);
          this.resetMeta("currentArrayType");
        }

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
      case SyntaxKind.Block: {
        this.pushIndentation();
        this.newLine();
        for (const statement of (<Block>node).statements)
          this.walk(statement);

        this.popIndentation();
        break;
      }
      case SyntaxKind.ExpressionStatement: {
        this.walk((<ExpressionStatement>node).expression);
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

  private walkModifiers(container: { modifiers?: NodeArray<ModifierLike> }) {
    for (const modifier of container.modifiers ?? [])
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
        this.meta.currentArrayType = this.getMappedType(arrayType.elementType.getText(this.sourceNode));
        break;
      }
      case SyntaxKind.NumberKeyword: {
        this.append("Num");
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
        const typeName = this.getMappedType(ref.typeName.getText(this.sourceNode));
        this.append(typeName);
        if (ref.typeArguments) {
          this.append("(");
          for (const typeArg of ref.typeArguments) {
            this.walkType(typeArg);
            if (this.isNotLast(typeArg, ref.typeArguments))
              this.append(", ");
          }
          this.append(")");

          if (typeName === "Hash") {
            const [ keyType, valueType ] = ref.typeArguments;
            this.meta.currentHashKeyType = this.getMappedType(keyType.getText(this.sourceNode));
            this.meta.currentHashValueType = this.getMappedType(valueType.getText(this.sourceNode));
          }
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

  private isNotLast<T = unknown>(element: T, array: ArrayLike<T> & { indexOf(e: T): number; }): boolean {
    return array.indexOf(element) !== array.length - 1
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

  private resetMeta(key: MetaKey): void {
    this.meta[key] = undefined;
  }

  private error(node: Node, message: string) {
    const { line, character } = getLineAndCharacterOfPosition(this.sourceNode, node.getStart(this.sourceNode));
    Log.error(`(${line + 1}, ${character + 1}): ${message}`);
    process.exit(1);
  }

  private pushIndentation(): void {
    this.indentation++;
  }

  private popIndentation(): void {
    this.indentation--;
  }

  private newLine(): void {
    this.append("\n");
    this.append("    ".repeat(this.indentation));
  }

  private append(...strings: string[]): void {
    this.generated.push(...strings);
  }
}