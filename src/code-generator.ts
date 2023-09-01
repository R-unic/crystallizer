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
  FunctionDeclaration,
  ParameterDeclaration,
  ExpressionStatement,
  Block,
  ReturnStatement,
  CallExpression,
  BinaryExpression,
  PrefixUnaryExpression,
  IfStatement,
  PropertyAccessExpression,
  AsExpression,
  TypeAssertion,
  Expression,
  WhileStatement,
  ForStatement,
  PostfixUnaryExpression
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

export default class CodeGenerator {
  private indentation = 0;

  private readonly generated: string[] = ["alias Num = Int64 | Int32 | Int16 | Int8 | Float64 | Float32 | UInt64 | UInt32 | UInt16 | UInt8\n"];
  private readonly flags: string[] = [];
  private readonly meta: Record<MetaKey, MetaValues[MetaKey]> = {
    currentArrayType: undefined,
    currentHashKeyType: undefined,
    currentHashValueType: undefined
  }

  public constructor(
    private readonly sourceNode: SourceFile
  ) {}

  public generate(): string {
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

      case SyntaxKind.BinaryExpression: {
        const binary = <BinaryExpression>node;
        this.walk(binary.left);
        this.append(` ${binary.operatorToken.getText(this.sourceNode)} `);
        this.walk(binary.right);
        break;
      }
      case SyntaxKind.PrefixUnaryExpression: {
        const unary = <PrefixUnaryExpression>node;
        this.append(Util.syntaxKindToText(unary.operator));
        this.walk(unary.operand);
        break;
      }
      case SyntaxKind.PostfixUnaryExpression: {
        const postfix = <PostfixUnaryExpression>node;
        this.walk(postfix.operand);
        this.append(" ");

        if (postfix.operator == SyntaxKind.PlusPlusToken)
          this.append("+");
        else
          this.append("-");

        this.append("= 1");
        break;
      }
      case SyntaxKind.PropertyAccessExpression: {
        const access = <PropertyAccessExpression>node;
        const objectText = access.expression.getText(this.sourceNode);
        const propertyName = access.name.getText(this.sourceNode);
        if (objectText === "console")
          if (propertyName === "log") {
            this.append("puts")
            break;
          }

        this.walk(access.expression);
        this.append(".");
        this.walk(access.name);
        break;
      }

      case SyntaxKind.TypeAssertionExpression:
      case SyntaxKind.AsExpression: {
        const cast = <Node & { expression: Expression; type: TypeNode }>node;
        this.walk(cast.expression);
        this.appendTypeCastMethod(cast.type);
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

        this.newLine();
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
          return this.error(declaration, "Anonymous functions not supported yet.", "UnsupportedAnonymousFunctions");

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

        if (declaration.body) {
          this.walk(declaration.body);
          this.generated.pop();
          this.generated.pop();
        }

        this.newLine();
        this.append("end");
        this.newLine();
        break;
      }

      case SyntaxKind.ForStatement: {
        const forStatement = <ForStatement>node;
        if (forStatement.initializer)
          this.walk(forStatement.initializer);

        this.append("while ")
        if (forStatement.condition)
          this.walk(forStatement.condition);
        else
          this.append("true");

        const bodyIsBlock = forStatement.statement.kind !== SyntaxKind.Block;
        if (bodyIsBlock) {
          this.pushIndentation();
          this.newLine();
        }

        this.walk(forStatement.statement);
        if (forStatement.incrementor) {
          this.newLine();
          this.walk(forStatement.incrementor);
        }

        if (bodyIsBlock)
          this.popIndentation();

        this.newLine();
        this.append("end");
        this.newLine();
        break;
      }
      case SyntaxKind.WhileStatement: {
        const whileStatement = <WhileStatement>node;
        const isUnary = whileStatement.expression.kind === SyntaxKind.PrefixUnaryExpression;
        const condition = <PrefixUnaryExpression>whileStatement.expression;
        const conditionInverted = (condition).operator === SyntaxKind.ExclamationToken;
        if (isUnary && conditionInverted)
          this.append("until ");
        else
          this.append("while ");

        this.walk(isUnary ? condition.operand : condition);
        if (whileStatement.statement.kind !== SyntaxKind.Block) {
          this.pushIndentation();
          this.newLine();
          this.popIndentation();
        }

        this.walk(whileStatement.statement);
        this.newLine();
        this.append("end");
        this.newLine();
        break;
      }
      case SyntaxKind.IfStatement: {
        const ifStatement = <IfStatement>node;
        const isUnary = ifStatement.expression.kind === SyntaxKind.PrefixUnaryExpression;
        const condition = <PrefixUnaryExpression>ifStatement.expression;
        const conditionInverted = isUnary && (condition).operator === SyntaxKind.ExclamationToken;
        if (conditionInverted)
          this.append("unless ");
        else
          this.append("if ");

        this.walk(conditionInverted ? condition.operand : condition);
        if (ifStatement.thenStatement.kind !== SyntaxKind.Block) {
          this.pushIndentation();
          this.newLine();
          this.popIndentation();
        }

        this.walk(ifStatement.thenStatement);
        if (ifStatement.elseStatement) {
          this.newLine();
          this.append(ifStatement.elseStatement.kind === SyntaxKind.IfStatement ? "els" : "else");
          if (ifStatement.elseStatement.kind !== SyntaxKind.Block) {
            this.pushIndentation();
            this.newLine();
            this.popIndentation();
          }

          this.walk(ifStatement.elseStatement);
        }

        this.newLine();
        this.append("end");
        this.newLine();
        break;
      }
      case SyntaxKind.ExpressionStatement: {
        this.walk((<ExpressionStatement>node).expression);
        break;
      }

      case SyntaxKind.ObjectLiteralExpression: {
        const object = <ObjectLiteralExpression>node;
        this.append("{");
        if (object.properties.length > 0) {
          this.pushIndentation();
          this.newLine();
        }

        for (const property of object.properties) {
          const [ name, _, value ] = property.getChildren(this.sourceNode);

          if (name.kind == SyntaxKind.Identifier)
            this.append('"');
          this.walk(name);
          if (name.kind == SyntaxKind.Identifier)
            this.append('"');

          this.append(" => ");
          this.walk(value);
          if (this.isNotLast(property, object.properties)) {
            this.append(",");
            this.newLine();
          }
        }

        if (object.properties.length > 0) {
          this.popIndentation();
          this.newLine();
        }

        this.append("}");
        if (object.properties.length === 0) {
          if (!this.meta.currentHashKeyType || !this.meta.currentHashValueType)
            return this.error(object, "Empty objects must have a Record type annotation.", "UnannotatedEmptyObject");

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
            return this.error(array, "Empty arrays must have a type annotation.", "UnannotatedEmptyArray");

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
      case SyntaxKind.SyntaxList: {
        this.walkChildren(node);
        break;
      }

      case SyntaxKind.EndOfFileToken: {
        break;
      }

      default:
        throw new Error(`Unhandled AST syntax: ${Util.getSyntaxName(node.kind)}`);
    }
  }

  private appendTypeCastMethod(type: TypeNode) {
    this.append(".");

    const to = "to_";
    switch (type.kind) {
      case SyntaxKind.NumberKeyword: {
        this.append(to + "f64");
        break;
      }
      case SyntaxKind.StringKeyword: {
        this.append(to + "s");
        break;
      }
      case SyntaxKind.TypeReference: {
        const typeText = type.getText(this.sourceNode);
        if (UNDECLARABLE_TYPE_NAMES.includes(typeText)) {
          this.append(to + typeText);
          break;
        }
      }

      default: {
        this.append("as(");
        this.walkType(type);
        this.append(")");
        break;
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
          console.error(`Unhandled modifier: ${Util.getSyntaxName(modifier.kind)}`);
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
      default:
        throw new Error(`Unhandled type node: ${Util.getSyntaxName(type.kind)}`);
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

  private error(node: Node, message: string, errorType: string) {
    const { line, character } = getLineAndCharacterOfPosition(this.sourceNode, node.getStart(this.sourceNode));
    Log.error(
      this.sourceNode,
      message,
      line, character,
      `Crystallizer.${errorType}`,
      node.getText(this.sourceNode)
    );
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