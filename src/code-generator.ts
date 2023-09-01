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
  ElementAccessExpression,
  Expression,
  WhileStatement,
  ForStatement,
  PostfixUnaryExpression,
  ClassDeclaration,
  ExpressionWithTypeArguments,
  PropertyDeclaration,
  PropertySignature,
  MethodSignature,
  MethodDeclaration,
  TypeParameterDeclaration,
  ConstructorDeclaration,
  NewExpression,
  ParenthesizedExpression,
  ForOfStatement,
} from "typescript";
import path from "path";

import Util from "./utility";
import Log from "./logger";
import StringBuilder from "./string-builder";

import TYPE_MAP from "./type-map";
import BINARY_OPERATOR_MAP from "./binary-operator-map";
import { mkdirSync, rmSync, rmdirSync } from "fs";
const UNDECLARABLE_TYPE_NAMES = ["i32", "f32", "u32", "i64", "f64", "u64"];
const UNCASTABLE_TYPES = [SyntaxKind.UnknownKeyword, SyntaxKind.AnyKeyword];
const CLASS_MODIFIERS = [SyntaxKind.PublicKeyword, SyntaxKind.PrivateKeyword, SyntaxKind.ProtectedKeyword, SyntaxKind.ReadonlyKeyword];

type MetaKey = "currentArrayType" | "currentHashKeyType" | "currentHashValueType" | "publicClassProperties";
interface MetaValues {
  currentArrayType?: string;
  currentHashKeyType?: string;
  currentHashValueType?: string;
  publicClassProperties: ParameterDeclaration[];
}

const DEFAULT_META: Record<MetaKey, MetaValues[MetaKey]> = {
  currentArrayType: undefined,
  currentHashKeyType: undefined,
  currentHashValueType: undefined,
  publicClassProperties: []
};

export default class CodeGenerator extends StringBuilder {
  private readonly flags: string[] = [];
  private readonly meta = DEFAULT_META;

  public constructor(
    private readonly sourceNode: SourceFile,
    private readonly projectDir: string
  ) { super(); }

  public generate(): string {
    this.appendRuntimeLibImport();
    this.walkChildren(this.sourceNode);
    return this.generated.trim();
  }

  private appendRuntimeLibImport(): void {
    const projectRuntimeLibPath = path.join(this.projectDir, "runtime_lib");
    if (Util.isDirectory(projectRuntimeLibPath))
      rmSync(projectRuntimeLibPath, {
        force: true,
        recursive: true
      });
    if (!Util.isDirectory(projectRuntimeLibPath)) {
      mkdirSync(projectRuntimeLibPath);
      Util.copyDirectory(path.join(__dirname, "../runtime_lib"), projectRuntimeLibPath);
    }

    const relativeProjectPath = path.relative(this.sourceNode.fileName, this.projectDir);
    const fixedProjectPath = relativeProjectPath.split(path.sep).slice(0, -3).join(path.sep)
    this.append(`require "${path.join(fixedProjectPath, "runtime_lib/*")}"\n\n`);
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

      case SyntaxKind.ExpressionWithTypeArguments: {
        const typedExpression = <ExpressionWithTypeArguments>node;
        this.walk(typedExpression.expression);
        if (typedExpression.typeArguments) {
          this.append("(");
          for (const typeArg of typedExpression.typeArguments) {
            this.walkType(typeArg);
            if (Util.isNotLast(typeArg, typedExpression.typeArguments))
              this.append(", ");
          }
          this.append(")");
        }
        break;
      }
      case SyntaxKind.ParenthesizedExpression: {
        const parenthesized = <ParenthesizedExpression>node;
        this.append("(");
        this.walk(parenthesized.expression);
        this.append(")");
        break;
      }
      case SyntaxKind.BinaryExpression: {
        const binary = <BinaryExpression>node;
        this.walk(binary.left);

        const operatorText = binary.operatorToken.getText(this.sourceNode);
        this.append(` ${this.getMappedBinaryOperator(operatorText)} `);
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
        const propertyNameText = access.name.getText(this.sourceNode);
        if (objectText === "console")
          if (propertyNameText === "log") {
            this.append("puts");
            break;
          }

        this.walk(access.expression);
        this.append(access.expression.kind === SyntaxKind.ThisKeyword ? "" : ".");
        this.walk(access.name);
        break;
      }
      case SyntaxKind.ElementAccessExpression: {
        const access = <ElementAccessExpression>node;
        if (access.expression.kind === SyntaxKind.ThisKeyword)
          return this.error(access.expression, `Cannot index 'this'. Use 'this.memberName' instead.`, "AttemptToIndexThis");

        const objectText = access.expression.getText(this.sourceNode);
        const indexText = access.argumentExpression.getText(this.sourceNode);
        if (objectText === "console")
          if (indexText === '"log"') {
            this.append("puts");
            break;
          }

        this.walk(access.expression);
        this.append("[");
        this.walk(access.argumentExpression);
        this.append("]");
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
            if (Util.isNotLast(arg, call.arguments))
              this.append(", ");
          }

          this.append(")");
        }
        break;
      }
      case SyntaxKind.NewExpression: {
        const newExpression = <NewExpression>node;
        this.walk(newExpression.expression);
        this.append(".new");
        if (newExpression.arguments && newExpression.arguments.length > 0) {
          this.append("(");
          for (const arg of newExpression.arguments) {
            this.walk(arg);
            if (Util.isNotLast(arg, newExpression.arguments))
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
        const declaration = <FunctionDeclaration>node;
        if (!declaration.name)
          return this.error(declaration, "Anonymous functions not supported yet.", "UnsupportedAnonymousFunctions");

        this.appendMethod(
          <Identifier>declaration.name,
          declaration.parameters,
          declaration.modifiers,
          declaration.type,
          declaration.typeParameters,
          declaration.body
        );

        this.newLine();
        break;
      }
      case SyntaxKind.Constructor: {
        const constructor = <ConstructorDeclaration>node;
        this.appendMethod(
          "initialize",
          constructor.parameters,
          constructor.modifiers,
          constructor.type,
          constructor.typeParameters,
          constructor.body
        );

        break;
      }
      case SyntaxKind.ThisKeyword: {
        this.append("@");
        break;
      }
      case SyntaxKind.ClassDeclaration: {
        const declaration = <ClassDeclaration>node;
        this.append("class ");
        if (declaration.name)
          this.walk(declaration.name);
        else
          this.append(Util.toPascalCase(path.basename(this.sourceNode.fileName)));

        if (declaration.typeParameters) {
          this.append("(")
          for (const typeParam of declaration.typeParameters)
            this.walk(typeParam.name);

          this.append(")")
        }

        const mixins: ExpressionWithTypeArguments[] = [];
        for (const heritageClause of declaration.heritageClauses ?? [])
          if (heritageClause.token == SyntaxKind.ExtendsKeyword) {
            this.append(" < ")
            this.walk(heritageClause.types[0]);
          } else
            mixins.push(...heritageClause.types);

        this.pushIndentation();
        this.newLine();

        for (const mixin of mixins) {
          this.append("include ");
          this.walk(mixin);
          this.newLine();
        }

        for (const member of declaration.members) {
          this.walk(member);
          if (Util.isNotLast(member, declaration.members))
            this.newLine();
        }

        const publicProperties = <ParameterDeclaration[]>this.meta.publicClassProperties;
        if (publicProperties.length > 0)
          this.newLine();

        for (const publicProperty of publicProperties) {
          this.append("property ");
          this.walk(publicProperty.name);
          if (publicProperty.type) {
            this.append(" : ");
            this.walkType(publicProperty.type);
          }

          if (Util.isNotLast(publicProperty, publicProperties))
            this.newLine();
        }

        this.meta.publicClassProperties = [];
        this.popIndentation();
        this.newLine();
        this.append("end");
        this.newLine();
        break;
      }
      case SyntaxKind.PropertySignature: {
        const signature = <PropertySignature>node;
        this.walkModifiers(signature);
        this.walk(signature.name);

        if (signature.type) {
          this.append(" : ");
          this.walkType(signature.type);
        }

        break;
      }
      case SyntaxKind.PropertyDeclaration: {
        const declaration = <PropertyDeclaration>node;
        this.walkModifiers(declaration);
        this.walk(declaration.name);

        if (declaration.type) {
          this.append(" : ");
          this.walkType(declaration.type);
        }

        if (declaration.initializer) {
          this.append(" = ");
          this.walk(declaration.initializer);
        }

        break;
      }
      case SyntaxKind.MethodSignature: {
        const signature = <MethodSignature>node;
        this.appendMethod(
          <Identifier>signature.name,
          signature.parameters,
          signature.modifiers,
          signature.type,
          signature.typeParameters
        );

        break;
      }
      case SyntaxKind.MethodDeclaration: {
        const declaration = <MethodDeclaration>node;
        this.appendMethod(
          <Identifier>declaration.name,
          declaration.parameters,
          declaration.modifiers,
          declaration.type,
          declaration.typeParameters,
          declaration.body
        );

        break;
      }

      case SyntaxKind.ForOfStatement: {
        const forOfStatement = <ForOfStatement>node;
        this.walk(forOfStatement.expression);
        this.append(".for_each do |");

        const declarationList = <VariableDeclarationList>forOfStatement.initializer;
        this.walk(declarationList.declarations[0].name);
        this.append("|");

        if (forOfStatement.statement.kind !== SyntaxKind.Block) {
          this.pushIndentation();
          this.newLine();
          this.popIndentation();
        }

        this.walk(forOfStatement.statement);
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
        if (forStatement.incrementor)
          this.walk(forStatement.incrementor);

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
          if (Util.isNotLast(property, object.properties)) {
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
          this.append(<string>this.meta.currentHashKeyType);
          this.append(" => ");
          this.append(<string>this.meta.currentHashValueType);
          this.resetMeta("currentHashKeyType");
          this.resetMeta("currentHashValueType");
        }

        break;
      }
      case SyntaxKind.ArrayLiteralExpression: {
        const array = <ArrayLiteralExpression>node;
        if (!this.meta.currentArrayType)
          return this.error(array, "All arrays must have a type annotation.", "UnannotatedArray");

        const elementType = this.getMappedType(<string>this.meta.currentArrayType);
        this.resetMeta("currentArrayType");

        this.append("TsArray(");
        this.append(elementType);
        this.append(").new(");
        this.append("[");
        for (const element of array.elements) {
          this.walk(element);
          if (array.elements.indexOf(element) !== array.elements.length - 1)
          this.append(", ");
        }

        this.append("] of ");
        this.append(elementType);
        this.append(")");
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

  private appendMethod(
    name: Identifier | string,
    parameters: NodeArray<ParameterDeclaration>,
    modifiers?: NodeArray<ModifierLike>,
    type?: TypeNode,
    typeParameters?: NodeArray<TypeParameterDeclaration>,
    body?: Block
  ) {

    this.walkModifierList(modifiers?.values(), false);
    this.append("def ")

    const isStatic = modifiers?.map(mod => mod.kind)?.includes(SyntaxKind.StaticKeyword);
    if (isStatic)
      this.append("self.");

    if (typeof name === "string")
      this.append(name);
    else
      this.walk(name);

    if (parameters.length > 0) {
      this.append("(");
      for (const param of parameters) {
        const modifierTypes = param.modifiers?.map(mod => mod.kind) ?? [];
        const isPublic = modifierTypes.includes(SyntaxKind.PublicKeyword);
        const isStatic = modifierTypes.includes(SyntaxKind.StaticKeyword);
        if (isPublic)
          (<ParameterDeclaration[]>this.meta.publicClassProperties).push(param);
        if (CLASS_MODIFIERS.includes(modifierTypes[0]))
          if (isStatic)
            this.append("@@");
          else
            this.append("@");

        this.walk(param);
        if (Util.isNotLast(param, parameters))
          this.append(", ");
      }
      this.append(")");
    }

    if (type) {
      this.append(" : ");
      this.walkType(type);
    }

    if (typeParameters) {
      this.append(" forall ");
      for (const typeParam of typeParameters) {
        this.walk(typeParam.name);
        if (Util.isNotLast(typeParam, typeParameters))
          this.append(", ");
      }
    }

    if (body) {
      this.walk(body);
      this.popLastPart(); // remove extra newlines
    }

    this.newLine();
    this.append("end");
  }

  private appendTypeCastMethod(type: TypeNode) {
    if (UNCASTABLE_TYPES.includes(type.kind)) return;
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

  private walkModifiers(container: { modifiers?: NodeArray<ModifierLike> }, isProperty = true): void {
    this.walkModifierList(container.modifiers?.values(), isProperty);
  }

  private walkModifierList(modifiers?: IterableIterator<ModifierLike>, isProperty = true) {
    for (const modifier of modifiers ?? [].values())
      switch (modifier.kind) {
        case SyntaxKind.PrivateKeyword: {
          this.append(isProperty ? "@" : "private ");
          break;
        }
        case SyntaxKind.PublicKeyword: {
          this.append(isProperty ? "property " : "");
          break;
        }
        case SyntaxKind.ReadonlyKeyword: {
          this.append("getter ");
          break;
        }
        case SyntaxKind.StaticKeyword: {
          this.append(isProperty ? "@@" : "");
          break;
        }
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
        this.append("TsArray(");
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
      case SyntaxKind.VoidKeyword: {
        this.append("Nil");
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
            if (Util.isNotLast(typeArg, ref.typeArguments))
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

      case SyntaxKind.AnyKeyword:
      case SyntaxKind.UnknownKeyword: {
        // remove any extra annotation text
        if (this.peekLastPart() === " : ")
          this.popLastPart();
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

  private getMappedBinaryOperator(text: string): string {
    return BINARY_OPERATOR_MAP.get(text) ?? text;
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
}