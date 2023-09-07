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
  AwaitExpression,
  ArrowFunction,
  ImportDeclaration,
  ConditionalExpression,
  BindingName,
  SpreadElement,
  FunctionTypeNode,
  ArrayBindingPattern,
  BindingElement,
  ObjectBindingPattern,
  TryStatement,
  ThrowStatement,
  ModuleDeclaration,
  ModuleBlock,
  Statement,
  HeritageClause,
  InterfaceDeclaration
} from "typescript";
import path from "path";

import Util from "./utility";
import Constants from "./constants";
import Log from "./logger";
import StringBuilder from "./string-builder";

import TYPE_MAP from "./type-map";
import BINARY_OPERATOR_MAP from "./binary-operator-map";

interface MetaValues extends Record<string, unknown> {
  currentArrayType?: string;
  currentHashKeyType?: string;
  currentHashValueType?: string;
  currentlyDeclaring?: string;
  blockParameter?: string;
  arrowFunctionName?: string;
  publicClassProperties: ParameterDeclaration[];
  allFunctionIdentifiers: string[];
  asyncFunctionIdentifiers: string[];
  inGlobalScope: boolean;
  spreadParameter: boolean;
  bindingCount: number;
}

const DEFAULT_META: MetaValues = {
  currentArrayType: undefined,
  currentHashKeyType: undefined,
  currentHashValueType: undefined,
  currentlyDeclaring: undefined,
  blockParameter: undefined,
  arrowFunctionName: undefined,
  publicClassProperties: [],
  allFunctionIdentifiers: [...Constants.REVERSE_ARGS_GLOBAL_FUNCTIONS, "parseInt", "parseFloat"], // TODO: make this (and the below field) a property of the Crystallizer class instead to track function identifiers across all files, import these in
  asyncFunctionIdentifiers: [],
  inGlobalScope: true,
  spreadParameter: false,
  bindingCount: 0
};

export default class CodeGenerator extends StringBuilder {
  private readonly flags: string[] = [];
  private readonly meta = structuredClone(DEFAULT_META);

  public constructor(
    private readonly sourceNode: SourceFile,
    private readonly testing = false
  ) { super(); }

  public generate(): string {
    if (!this.testing) {
      this.append("# Compiled from TypeScript with Crystallizer");
      this.newLine();
      this.append(`require "./runtime_lib/*"`);
      this.newLine(2);
    }

    this.walkChildren(this.sourceNode);
    return this.generated.trim();
  }

  private walk(node: Node): void {
    switch(node.kind) {
      case SyntaxKind.QualifiedName: {
        const { left, right } = <QualifiedName>node;
        this.walk(left);
        this.append("::");
        this.walk(right);
        break
      }
      case SyntaxKind.Identifier: {
        const { text } = <Identifier>node;
        const isTypeIdent = this.consumeFlag("TypeIdent");
        this.append(isTypeIdent ? this.getMappedType(text) : this.getMappedIdentifier(text));
        break;
      }
      case SyntaxKind.VariableDeclaration: {
        const declaration = <VariableDeclaration>node;
        if (declaration.initializer?.kind === SyntaxKind.ArrowFunction) {
          this.meta.arrowFunctionName = declaration.name.getText(this.sourceNode);
          this.walk(declaration.initializer);
        } else {
          this.walk(declaration.name);

          if (declaration.type) {
            this.append(" : ");
            this.walkType(declaration.type)
            if (declaration.type.kind === SyntaxKind.ArrayType)
              this.meta.currentArrayType = this.getMappedType((<ArrayTypeNode>declaration.type).elementType.getText(this.sourceNode));
          }

          if (declaration.initializer) {
            this.append(" = ");
            this.walk(declaration.initializer);
          }
          this.resetMeta("currentArrayType");
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
        if (Constants.UNDECLARABLE_TYPE_NAMES.includes(alias.name.getText(this.sourceNode)))
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
        const operatorText = binary.operatorToken.getText(this.sourceNode);
        this.walk(binary.left);

        if (operatorText === "instanceof")
          this.append(".class <= ");
        else
          this.append(` ${this.getMappedBinaryOperator(operatorText)} `);

        this.walk(binary.right);
        break;
      }
      case SyntaxKind.ConditionalExpression: {
        const ternary = <ConditionalExpression>node;
        this.walk(ternary.condition);
        this.append(" ? ");
        this.walk(ternary.whenTrue);
        this.append(" : ");
        this.walk(ternary.whenFalse);
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
        if (propertyNameText === "toString") {
          this.append("to_s");
          break;
        }

        this.walk(access.name);
        if (propertyNameText === "floor")
          this.append(".to_i");

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
        if (indexText === '"toString"') {
          this.append(".to_s");
          break;
        }

        this.append("[");
        this.walk(access.argumentExpression);
        this.append("]");
        if (indexText === '"floor"')
          this.append(".to_i");

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
        let callArguments: NodeArray<Expression> | Expression[] = call.arguments;
        let blockParameter = false;

        if ([SyntaxKind.Identifier, SyntaxKind.PropertyAccessExpression].includes(call.expression.kind)) {
          const isPropertyAccess = call.expression.kind === SyntaxKind.PropertyAccessExpression;
          const functionName = isPropertyAccess
            ? (<PropertyAccessExpression>call.expression).name.text
            : (<Identifier>call.expression).text;

          if (functionName[0] !== functionName[0].toLowerCase())
            return this.error(call.expression, "Function names cannot begin with capital letters.", "FunctionBeganWithCapital");

          if (this.meta.inGlobalScope && this.meta.asyncFunctionIdentifiers.includes(functionName))
            this.append("await ");

          const reverseGlobalArgs = Constants.REVERSE_ARGS_GLOBAL_FUNCTIONS.includes(functionName) && !isPropertyAccess;
          const reverseClassArgs = Constants.REVERSE_ARGS_CLASS_FUNCTIONS.includes(functionName) && isPropertyAccess;
          if (reverseClassArgs || reverseGlobalArgs)
            callArguments = callArguments.map((_, index, array) => array[array.length - 1 - index]);

          this.walk(call.expression);
          if (this.meta.blockParameter === functionName) {
            this.append(".call");
            blockParameter = true;
          }
        } else
          this.walk(call.expression);

        this.appendCallExpressionArguments(callArguments, blockParameter);
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
      case SyntaxKind.AwaitExpression: {
        const awaitExpression = <AwaitExpression>node;
        this.append("await ");
        this.walk(awaitExpression.expression);
        break;
      }
      case SyntaxKind.SpreadElement: {
        const spread = <SpreadElement>node;
        this.append("*");
        this.walk(spread.expression);
        break;
      }
      // case SyntaxKind.ArrayBindingPattern: {
      //   const bindingPattern = <ArrayBindingPattern>node;
      //   this.append("binding = ");
      //   for (const element of bindingPattern.elements) {
      //     this.walk(element);
      //     this.append("[");
      //     this.append(bindingPattern.elements.indexOf(element).toString());
      //     this.append("]");
      //   }

      //   break;
      // }
      // case SyntaxKind.ObjectBindingPattern: {
      //   const bindingPattern = <ObjectBindingPattern>node;
      //   for (const element of bindingPattern.elements) {
      //     this.walk(element);
      //     this.append(".");
      //     this.walk(element.propertyName!);
      //   }

      //   break;
      // }
      // case SyntaxKind.BindingElement: {
      //   const binding = <BindingElement>node;
      //   if (binding.initializer) {
      //     this.walk(binding.name);
      //     this.append(" = ");
      //     this.walk(binding.initializer);
      //   }

      //   break;
      // }

      // FUNCTION STUFF STATEMENTS
      case SyntaxKind.ReturnStatement: {
        const statement = <ReturnStatement>node;
        this.pushFlag("Returned");
        this.append("return");

        if (statement.expression) {
          this.append(" ");
          this.walk(statement.expression);
        }

        break;
      }
      case SyntaxKind.Parameter: {
        const param = <ParameterDeclaration>node;
        if (param.dotDotDotToken) {
          this.meta.spreadParameter = true;
          this.append("*");
        }

        if (param.type?.kind === SyntaxKind.FunctionType) {
          if (this.meta.blockParameter)
            return this.error(param, "Cannot define more than one function parameter.", "MultipleFunctionParameters");

          this.append("&");
          this.meta.blockParameter = param.name.getText(this.sourceNode);
        }

        this.walk(param.name);
        if (param.type) {
          this.append(" : ");
          this.walkType(param.type);
          if (param.questionToken)
            this.append("?");
          if (param.type.kind === SyntaxKind.ArrayType)
            this.meta.currentArrayType = this.getMappedType((<ArrayTypeNode>param.type).elementType.getText(this.sourceNode));
        }

        if (param.initializer) {
          this.append(" = ");
          this.walk(param.initializer);
        }

        this.meta.spreadParameter = false;
        this.resetMeta("currentArrayType");
        break;
      }
      case SyntaxKind.FunctionDeclaration: {
        const declaration = <FunctionDeclaration>node;
        if (!declaration.name)
          return this.error(declaration, "Anonymous functions are not supported yet.", "UnsupportedAnonymousFunctions");

        if (declaration.name.text[0] !== declaration.name.text[0].toLowerCase())
          return this.error(declaration.name, "Function names cannot begin with capital letters.", "FunctionBeganWithCapital");

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
      case SyntaxKind.ArrowFunction: {
        const arrowFunction = <ArrowFunction>node;

        // TODO: disallow call expressions on arrow functions directly
        this.append("def ");
        this.append(this.meta.arrowFunctionName!);
        this.resetMeta("arrowFunctionName");

        if (arrowFunction.parameters.length > 0) {
          this.append("(");
          this.appendParameters(arrowFunction);
          this.append(")");
        }

        const bodyIsBlock = arrowFunction.body.kind === SyntaxKind.Block;
        if (!bodyIsBlock) {
          this.pushIndentation();
          this.newLine();
        }

        this.walk(arrowFunction.body);
        if (!bodyIsBlock)
          this.popIndentation();

        this.newLine();
        this.append("end");
        break;
      }

      // CLASS STUFF STATEMENTS
      case SyntaxKind.InterfaceDeclaration: {
        return this.error(node, "Interfaces are not supported.", "UnsupportedInterfaces")
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
        this.appendClassDeclaration(
          () => {
            for (const member of declaration.members)
              this.walk(member);
          },
          declaration.name,
          declaration.typeParameters,
          declaration.heritageClauses
        );

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
      case SyntaxKind.ModuleDeclaration: {
        const declaration = <ModuleDeclaration>node;
        this.handleExporting();

        this.append("module ");
        this.walk(declaration.name);

        if (declaration.body) {
          this.walk(declaration.body);
          this.popLastPart();
        }

        this.newLine();
        this.append("end");
        this.newLine();
        break;
      }

      case SyntaxKind.ImportDeclaration: {
        const imports = <ImportDeclaration>node;
        this.append("require ");
        this.walk(imports.moduleSpecifier);
        this.newLine();
        break;
      }

      // CONDITIONAL/LOOP STATEMENTS
      case SyntaxKind.ForOfStatement: {
        const forOfStatement = <ForOfStatement>node;
        this.walk(forOfStatement.expression);
        this.append(".forEach do |");

        const declarationList = <VariableDeclarationList>forOfStatement.initializer;
        this.walk(declarationList.declarations[0].name);
        this.append("|");

        const bodyIsBlock = forOfStatement.statement.kind === SyntaxKind.Block;
        if (!bodyIsBlock) {
          this.pushIndentation();
          this.newLine();
        }

        this.walk(forOfStatement.statement);
        if (!bodyIsBlock)
          this.popIndentation();

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

        const bodyIsBlock = forStatement.statement.kind === SyntaxKind.Block;
        if (!bodyIsBlock) {
          this.pushIndentation();
          this.newLine();
        }

        this.walk(forStatement.statement);
        if (forStatement.incrementor)
          this.walk(forStatement.incrementor);

        if (!bodyIsBlock)
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

        const bodyIsBlock = whileStatement.statement.kind === SyntaxKind.Block;
        if (!bodyIsBlock) {
          this.pushIndentation();
          this.newLine();
        }

        this.walk(whileStatement.statement);
        if (!bodyIsBlock)
          this.popIndentation();

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

        const thenBodyIsBlock = ifStatement.thenStatement.kind === SyntaxKind.Block;
        if (!thenBodyIsBlock) {
          this.pushIndentation();
          this.newLine();
        }

        this.walk(ifStatement.thenStatement);
        if (!thenBodyIsBlock)
          this.popIndentation();

        if (ifStatement.elseStatement) {
          this.newLine();
          this.append(ifStatement.elseStatement.kind === SyntaxKind.IfStatement ? "els" : "else");

          const elseBodyIsBlock = ifStatement.elseStatement.kind === SyntaxKind.Block;
          if (!elseBodyIsBlock) {
            this.pushIndentation();
            this.newLine();
          }

          this.walk(ifStatement.elseStatement);
          if (!elseBodyIsBlock)
            this.popIndentation();
        }

        this.newLine();
        this.append("end");
        this.newLine();
        break;
      }
      case SyntaxKind.TryStatement: {
        const tryStatement = <TryStatement>node;

        this.append("begin");
        this.walk(tryStatement.tryBlock);
        this.popLastPart();
        this.popIndentation();
        this.newLine();
        this.append("rescue ");

        if (tryStatement.catchClause) {
          const variable = tryStatement.catchClause.variableDeclaration;
          if (variable)
            this.walk(variable);
          else
            this.append("ex : Exception");

          this.popLastPart();
          this.walk(tryStatement.catchClause.block);
          this.popIndentation();
          this.newLine();
        }

        if (tryStatement.finallyBlock) {
          this.append("ensure")
          this.walk(tryStatement.finallyBlock);
          this.popLastPart();
          this.popIndentation();
          this.newLine();
        }

        this.append("end");
        break;
      }
      case SyntaxKind.ThrowStatement: {
        const throwStatement = <ThrowStatement>node;
        this.append("raise ");
        this.walk(throwStatement.expression);
        break;
      }
      case SyntaxKind.ExpressionStatement: {
        const statement = <ExpressionStatement>node;
        this.walk(statement.expression);

        if (![SyntaxKind.BinaryExpression].includes(statement.expression.kind))
          this.newLine();

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
          this.append(this.meta.currentHashKeyType);
          this.append(" => ");
          this.append(this.meta.currentHashValueType);
          this.resetMeta("currentHashKeyType", "currentHashValueType");
        }

        break;
      }
      case SyntaxKind.ArrayLiteralExpression: {
        const array = <ArrayLiteralExpression>node;
        if (array.elements.length === 0 && !this.meta.currentArrayType)
          return this.error(array, "Empty arrays must have a type annotation.", "UnannotatedEmptyArray");

        this.append("TsArray.new([");
        for (const element of array.elements) {
          this.walk(element);
          if (array.elements.indexOf(element) !== array.elements.length - 1)
          this.append(", ");
        }

        this.append("]");
        if (this.meta.currentArrayType) {
          const elementType = this.getMappedType(this.meta.currentArrayType);
          this.resetMeta("currentArrayType");
          this.append(" of ");
          this.append(elementType);
        }

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
        this.append("false");
        break;
      }
      case SyntaxKind.FirstLiteralToken: {
        this.append((<LiteralLikeNode>node).text);
        break;
      }
      case SyntaxKind.ModuleBlock: {
        this.appendBlock(<ModuleBlock>node, true);
        break;
      }
      case SyntaxKind.Block: {
        this.appendBlock(<Block>node);
        break;
      }
      case SyntaxKind.SyntaxList: {
        this.walkChildren(node);
        break;
      }

      case SyntaxKind.LabeledStatement: {
        return this.error(node, "Labeled statements are not supported.", "UnsupportedLabeledStatements");
      }

      case SyntaxKind.EndOfFileToken: {
        break;
      }

      default:
        throw new Error(`Unhandled AST syntax: ${Util.getSyntaxName(node.kind)}`);
    }
  }

  private appendClassDeclaration(
    walkMembers: () => void,
    name?: Identifier,
    typeParameters?: NodeArray<TypeParameterDeclaration>,
    heritageClauses?: NodeArray<HeritageClause>
  ): void {

    this.handleExporting();
    this.append("class ");
    if (name)
      this.walk(name);
    else
      this.append(Util.toPascalCase(path.basename(this.sourceNode.fileName)));

    if (typeParameters) {
      this.append("(");
      for (const typeParam of typeParameters)
        this.walk(typeParam.name);

      this.append(")");
    }

    const mixins: ExpressionWithTypeArguments[] = [];
    for (const heritageClause of heritageClauses ?? [])
      if (heritageClause.token == SyntaxKind.ExtendsKeyword) {
        this.append(" < ");
        this.walk(heritageClause.types[0]);
      }
      else
        mixins.push(...heritageClause.types);

    this.pushIndentation();
    this.newLine();

    for (const mixin of mixins) {
      this.append("include ");
      this.walk(mixin);
      this.newLine();
    }

    walkMembers();
    if (this.meta.publicClassProperties.length > 0)
      this.newLine();

    for (const publicProperty of this.meta.publicClassProperties) {
      this.append("property ");
      this.walk(publicProperty.name);
      if (publicProperty.type) {
        this.append(" : ");
        this.walkType(publicProperty.type);
      }

      if (Util.isNotLast(publicProperty, this.meta.publicClassProperties))
        this.newLine();
    }

    this.meta.publicClassProperties = [];
    this.popIndentation();
    this.newLine();
    this.append("end");
    this.newLine();
  }

  private appendBlock<T extends Node & { statements: NodeArray<Statement> }>(node: T, module = false): void {
    const enclosingIsInScope = this.meta.inGlobalScope;
    this.meta.inGlobalScope = false;
    this.pushIndentation();
    this.newLine();

    if (module) {
      this.append("extend self");
      this.newLine(2);
    }

    for (const statement of node.statements)
      this.walk(statement);

    this.popIndentation();
    this.meta.inGlobalScope = enclosingIsInScope;
  }

  private appendCallExpressionArguments(callArguments: NodeArray<Expression> | Expression[], blockParameter: boolean): void {
    let blockName: Identifier | undefined;
    if (callArguments.length > 0) {
      let providedArrowFunction = false;
      let providedBlock = false;

      this.append("(");
      for (const arg of callArguments)
        if (arg.kind === SyntaxKind.Identifier && this.meta.allFunctionIdentifiers.includes((<Identifier>arg).text)) {
          if (providedBlock || providedArrowFunction)
            this.error(arg, "Functions may only have one function argument.", "MultipleFunctionsPassed");

          blockName = <Identifier>arg;
          providedBlock = true;
        } else if (arg.kind === SyntaxKind.ArrowFunction) {
          if (providedBlock || providedArrowFunction)
            this.error(arg, "Functions may only have one function argument.", "MultipleFunctionsPassed");

          providedArrowFunction = true;
          this.popLastPart();

          const arrowFunction = <ArrowFunction>arg;
          this.append(" do");
          if (arrowFunction.parameters.length > 0) {
            this.append(" |");
            this.appendParameters(arrowFunction);
            this.append("|");
          }

          const functionBodyIsBlock = arrowFunction.body.kind === SyntaxKind.Block;
          if (!functionBodyIsBlock) {
            this.pushIndentation();
            this.newLine();
          }

          this.walk(arrowFunction.body);
          if (!functionBodyIsBlock)
            this.popIndentation();

          this.newLine();
          this.append("end");
        } else {
          this.walk(arg);
          if (Util.isNotLast(arg, callArguments))
            this.append(", ");
        }

      if (blockName) {
        this.append("&");
        this.walk(blockName);
      }

      if (!providedArrowFunction)
        this.append(")");
    } else if (blockParameter)
      this.append("(nil)");
  }

  private handleExporting(): void {
    const isExported = this.consumeFlag("Export");
    if (!isExported)
      this.append("private ");
  }

  private appendParameters(fn: { parameters: NodeArray<ParameterDeclaration>; }): void {
    for (const parameter of fn.parameters) {
      this.walk(parameter)
      if (Util.isNotLast(parameter, fn.parameters))
        this.append(", ");
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

    this.meta.allFunctionIdentifiers.push(typeof name === "string" ? name : name.text);
    this.walkModifierList(modifiers?.values(), false);
    const modifierKinds = modifiers?.map(mod => mod.kind);

    const isExported = this.consumeFlag("Export");
    if (!isExported && !modifierKinds?.includes(SyntaxKind.PrivateKeyword) && !modifierKinds?.includes(SyntaxKind.StaticKeyword) && !modifierKinds?.includes(SyntaxKind.PublicKeyword))
      this.append("private ");

    this.append("def ");

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
          this.meta.publicClassProperties.push(param);
        if (Constants.CLASS_MODIFIERS.includes(modifierTypes[0]))
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

    const isAsync = this.consumeFlag("Async");
    if (isAsync) {
      this.meta.asyncFunctionIdentifiers.push(typeof name === "string" ? name : name.text);
      this.pushIndentation();
      this.newLine();
      this.append("async! do");
    }

    if (body) {
      this.walk(body);

      const returned = this.consumeFlag("Returned");
      if (!returned)
        this.append("return");
    }

    if (isAsync) {
      this.newLine();
      this.append("end");
      this.popIndentation();
    }

    this.newLine();
    this.append("end");
    this.newLine();
  }

  private appendTypeCastMethod(type: TypeNode) {
    if (Constants.UNCASTABLE_TYPES.includes(type.kind)) return;
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
        if (Constants.UNDECLARABLE_TYPE_NAMES.includes(typeText)) {
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
        case SyntaxKind.AsyncKeyword: {
          this.pushFlag("Async");
          break;
        }
        case SyntaxKind.ExportKeyword: {
          this.pushFlag("Export");
          break;
        }
        case SyntaxKind.DeclareKeyword: {
          break;
        }

        default:
          throw new Error(`Unhandled modifier: ${Util.getSyntaxName(modifier.kind)}`);
      }
  }

  private walkType(type: TypeNode): void {
    switch(type.kind) {
      case SyntaxKind.NumberKeyword: {
        this.append("Num");
        break;
      }
      case SyntaxKind.BigIntKeyword: {
        this.append("BigInt");
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

      case SyntaxKind.ArrayType: {
        const arrayType = <ArrayTypeNode>type;
        if (this.meta.spreadParameter)
          this.walkType(arrayType.elementType);
        else {
          this.append("TsArray(");
          this.walkType(arrayType.elementType);
          this.append(")");
        }

        break;
      }

      case SyntaxKind.FunctionType: {
        // TODO: type parameters
        const functionType = <FunctionTypeNode>type;
        if (functionType.parameters.length > 0)
          for (const param of functionType.parameters) {
            if (!param.type)
              return this.error(param, "Function type parameter must have a type annotation.", "UnannotatedFunctionTypeParameter");

            this.walkType(param.type);
            if (Util.isNotLast(param, functionType.parameters))
              this.append(", ");
          }
        else
          this.append("Nil");

        this.append(" -> ");
        this.walkType(functionType.type);
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
    if (flag == NodeFlags.Let) return; // don't worry about let
    this.pushFlag(NodeFlags[flag]);
  }

  private pushFlag(flag: string) {
    if (this.flags.includes(flag)) return;
    this.flags.push(flag);
  }

  private getMappedIdentifier(text: string): string {
    return text
      .replace(/Error/, "Exception");
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

  private resetMeta(...keys: (keyof MetaValues)[]): void {
    for (const key of keys) {
      if (DEFAULT_META[key] !== undefined) continue;
      this.meta[key] = undefined;
    }
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