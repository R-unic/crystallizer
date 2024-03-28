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
  UnionTypeNode,
  ArrayTypeNode,
  ArrayLiteralExpression,
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
  SuperCall,
  ExpressionWithTypeArguments,
  PropertyDeclaration,
  PropertySignature,
  MethodSignature,
  MethodDeclaration,
  GetAccessorDeclaration,
  TypeParameterDeclaration,
  ConstructorDeclaration,
  NewExpression,
  ParenthesizedExpression,
  ForOfStatement,
  AwaitExpression,
  ArrowFunction,
  ImportDeclaration,
  ConditionalExpression,
  SpreadElement,
  FunctionTypeNode,
  BindingName,
  ArrayBindingPattern,
  ObjectBindingPattern,
  BindingElement,
  TryStatement,
  ThrowStatement,
  ModuleDeclaration,
  ModuleBlock,
  EnumDeclaration,
  EnumMember,
  Statement,
  HeritageClause,
  SwitchStatement,
  CaseBlock,
  isCaseClause,
  SetAccessorDeclaration,
  RegularExpressionLiteral,
  TemplateExpression
} from "typescript";
import path from "path";

import Util from "./utility";
import Constants from "./constants";
import Log from "./logger";
import StringBuilder from "./string-builder";
import AccessMacros from "./access-macros";

import TYPE_MAP from "./type-map";
import BINARY_OPERATOR_MAP from "./binary-operator-map";
import { Context, DEFAULT_META, MetaValues } from "./code-generator-meta";

export default class CodeGenerator extends StringBuilder {
  private readonly flags: string[] = [];
  private readonly meta = structuredClone(DEFAULT_META);
  private readonly accessMacros = new AccessMacros(this);

  public constructor(
    private readonly sourceNode: SourceFile,
    private readonly testing = false,
    tabSize = 2
  ) { super(tabSize); }

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
        this.append(isTypeIdent ? this.getMappedIdentifier(text) : this.getMappedType(text));
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
            this.setCurrentArrayType(declaration.type);
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
        const { flags, declarations } = <VariableDeclarationList>node;
        this.walkFlag(flags);
        for (const declaration of declarations)
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
        this.walkTypeArguments(typedExpression.typeArguments);
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
        if (operatorText === "=")
          this.newLine();

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
        const accessingThis = objectText === "this";
        if (this.accessMacros.matchesCompleteReplace(objectText, propertyNameText))
          return this.accessMacros.completeReplace(objectText, propertyNameText);

        this.walk(access.expression);
        if (accessingThis && this.meta.allFunctionIdentifiers.has(propertyNameText)) {
          this.popLastPart();
          this.append("self")
        }

        this.append(this.peekLastPart() === "@" ? "" : ".");
        if (this.accessMacros.matchesKeyReplace(propertyNameText))
          return this.accessMacros.keyReplace(propertyNameText);

        this.walk(access.name);
        if (this.accessMacros.matchesExtension(propertyNameText))
          this.accessMacros.addExtension(propertyNameText);

        break;
      }
      case SyntaxKind.ElementAccessExpression: {
        const access = <ElementAccessExpression>node;
        if (access.expression.kind === SyntaxKind.ThisKeyword)
          return this.error(access.expression, `Cannot index 'this'. Use 'this.memberName' instead.`, "AttemptToIndexThis");

        const objectText = access.expression.getText(this.sourceNode);
        const indexText = access.argumentExpression.getText(this.sourceNode);
        const indexStringContent = indexText.substring(1, -2);
        const accessingThis = objectText === "this";
        if (accessingThis && this.meta.allFunctionIdentifiers.has(indexStringContent)) {
          this.popLastPart();
          this.append("self");
        }

        if (this.accessMacros.matchesCompleteReplace(objectText, indexStringContent)) {
          this.accessMacros.completeReplace(objectText, indexStringContent);
          break; // don't continue
        }

        this.walk(access.expression);
        if (this.accessMacros.matchesKeyReplace(indexStringContent)) {
          this.append(".");
          this.accessMacros.keyReplace(indexStringContent);
          break; // don't continue
        }

        this.append("[");
        this.walk(access.argumentExpression);
        this.append("]");
        if (this.accessMacros.matchesExtension(indexStringContent))
          this.accessMacros.addExtension(indexStringContent);

        break;
      }
      case SyntaxKind.TypeAssertionExpression:
      case SyntaxKind.AsExpression: {
        const cast = <Node & { expression: Expression; type: TypeNode }>node;
        this.setCurrentArrayType(cast.type);
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

          if (this.meta.currentContext === Context.Global && this.meta.asyncFunctionIdentifiers.has(functionName))
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
        this.walkArguments(newExpression.arguments);
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

      case SyntaxKind.ContinueStatement: {
        this.append("next");
        break;
      }
      case SyntaxKind.BreakStatement: {
        if (this.meta.inSwitchStatement) return;
        this.append("break");
        break;
      }

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

          this.setCurrentArrayType(param.type);
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
      case SyntaxKind.EnumDeclaration: {
        const declaration = <EnumDeclaration>node;
        this.walkModifiers(declaration);
        this.append("enum ");
        this.walk(declaration.name);
        this.pushIndentation();
        this.newLine();

        const enclosingContext = this.meta.currentContext;
        this.meta.currentContext = Context.EnumBody;
        for (const member of declaration.members)
          this.walk(member);

        this.popIndentation();
        this.newLine();
        this.append("end");
        this.newLine();
        this.meta.currentContext = enclosingContext;
        break;
      }
      case SyntaxKind.EnumMember: {
        const member = <EnumMember>node;
        this.walk(member.name);
        if (member.initializer) {
          this.append(" = ");
          this.walk(member.initializer);
        }

        this.newLine();
        break;
      }
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
      case SyntaxKind.SuperKeyword: {
        const superCall = <SuperCall>node;
        this.append("super");
        this.walkArguments(superCall.arguments);
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
            for (const member of declaration.members) // add names first
              if (member.kind === SyntaxKind.MethodDeclaration)
                this.meta.allFunctionIdentifiers.add((<Identifier>member.name).text);

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
        const modifierKinds = signature.modifiers?.map(mod => mod.kind);

        this.walkModifiers(signature);
        if (modifierKinds?.includes(SyntaxKind.ProtectedKeyword))
          this.meta.protectedClassProperties.push({
            name: signature.name,
            type: signature.type
          });

        this.walk(signature.name);
        if (signature.type) {
          this.append(" : ");
          this.walkType(signature.type);
        }

        this.newLine();
        break;
      }
      case SyntaxKind.PropertyDeclaration: {
        const declaration = <PropertyDeclaration>node;
        const modifierKinds = declaration.modifiers?.map(mod => mod.kind);

        this.walkModifiers(declaration);
        if (modifierKinds?.includes(SyntaxKind.ProtectedKeyword))
          this.meta.protectedClassProperties.push({
            name: declaration.name,
            type: declaration.type
          });

        this.walk(declaration.name);
        if (declaration.type) {
          this.append(" : ");
          this.walkType(declaration.type);
          this.setCurrentArrayType(declaration.type);
        }

        if (declaration.initializer) {
          this.append(" = ");
          this.walk(declaration.initializer);
        }

        this.newLine();
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
      case SyntaxKind.SetAccessor: {
        const method = <SetAccessorDeclaration>node;
        this.appendMethod(
          (<Identifier>method.name).text + "=",
          method.parameters,
          method.modifiers,
          method.type,
          method.typeParameters,
          method.body
        );

        break;
      }
      case SyntaxKind.GetAccessor:
      case SyntaxKind.MethodDeclaration: {
        const method = <MethodDeclaration | GetAccessorDeclaration>node;
        this.appendMethod(
          <Identifier>method.name,
          method.parameters,
          method.modifiers,
          method.type,
          method.typeParameters,
          method.body
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

        if (this.peekLastPart().includes("\n"))
          this.popLastPart();

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

        if (this.peekLastPart().includes("\n"))
          this.popLastPart();

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

        if (this.peekLastPart().includes("\n"))
          this.popLastPart();

        if (ifStatement.elseStatement) {
          const elseBranchIsIf = ifStatement.elseStatement.kind === SyntaxKind.IfStatement;
          this.newLine();
          this.append("else");

          const elseBodyIsBlock = ifStatement.elseStatement.kind === SyntaxKind.Block;
          if (!elseBodyIsBlock) {
            this.pushIndentation();
            this.newLine();
          }

          this.walk(ifStatement.elseStatement);
          if (!elseBodyIsBlock)
            this.popIndentation();
        }

        if (this.peekLastPart().includes("\n"))
          this.popLastPart();

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
        }

        if (this.peekLastPart().includes("\n"))
          this.popLastPart();

        this.newLine();
        this.append("end");
        this.newLine();
        break;
      }
      case SyntaxKind.ThrowStatement: {
        const throwStatement = <ThrowStatement>node;
        this.append("raise ");
        this.walk(throwStatement.expression);
        this.newLine();
        break;
      }
      case SyntaxKind.SwitchStatement: {
        const switchStatement = <SwitchStatement>node;
        const enclosingContext = this.meta.currentContext;
        this.meta.currentContext = Context.SwitchStatement;

        this.append("case ");
        this.walk(switchStatement.expression);
        this.walk(switchStatement.caseBlock);

        this.append("end");
        this.newLine();
        this.meta.currentContext = enclosingContext;
        break;
      }
      case SyntaxKind.WithStatement: {
        return this.error(node, "The 'with' statement is not supported within Crystallizer.", "UnsupportedWithStatement");
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
      case SyntaxKind.RegularExpressionLiteral: {
        this.append(`TsRegex.new(${(<RegularExpressionLiteral>node).text})`);
        break;
      }
      case SyntaxKind.TemplateExpression: {
        const template = <TemplateExpression>node;
        this.append('"');
        this.append(template.head.text);
        for (const span of template.templateSpans) {
          this.append("#{")
          this.walk(span.expression);
          this.append("}");
          this.append(span.literal.text);
        }

        this.append('"');
        break;
      }
      case SyntaxKind.StringLiteral: {
        this.append((<StringLiteral>node).getFullText(this.sourceNode).trim());
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
      case SyntaxKind.CaseBlock: {
        const caseBlock = <CaseBlock>node;
        this.newLine();

        let lastEmpty = false;
        for (const clause of caseBlock.clauses) {
          if (isCaseClause(clause)) {
            if (!lastEmpty)
              this.append("when ");

            if (lastEmpty)
              this.append(", ");

            this.walk(clause.expression);
          } else
            this.append("else");

          lastEmpty = clause.statements.length === 0;
          if (!lastEmpty) {
            this.appendBlock(clause);
            this.newLine();
          }
        }

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

      case SyntaxKind.NonNullExpression:
      case SyntaxKind.EndOfFileToken: {
        break;
      }

      default:
        return this.error(node, Util.getSyntaxName(node.kind), "UnhandledASTSyntax");
    }
  }

  private setCurrentArrayType(type?: TypeNode) {
    if (type?.kind === SyntaxKind.ArrayType)
      this.meta.currentArrayType = this.getMappedType((<ArrayTypeNode>type).elementType.getText(this.sourceNode));
  }

  private walkTypeArguments(typeArgs?: NodeArray<TypeNode> | undefined): void {
    if (!typeArgs || typeArgs.length === 0) return;

    this.append("(");
    for (const typeArg of typeArgs) {
      this.walkType(typeArg);
      if (Util.isNotLast(typeArg, typeArgs))
        this.append(", ");
    }
    this.append(")");
  }

  private walkArguments(args?: NodeArray<Expression> | undefined): void {
    if (!args || args.length === 0) return;

    this.append("(");
    for (const arg of args) {
      this.walk(arg);
      if (Util.isNotLast(arg, args))
        this.append(", ");
    }
    this.append(")");
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

      const enclosingContext = this.meta.currentContext;
      this.meta.currentContext = Context.TypeParameters;

      for (const typeParam of typeParameters)
        this.walk(typeParam.name);

      this.append(")");
      this.meta.currentContext = enclosingContext;
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

    const enclosingContext = this.meta.currentContext;
    this.meta.currentContext = Context.ClassBody;
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

    if (this.meta.protectedClassProperties.length > 0)
      this.newLine();

    for (const protectedProperty of this.meta.protectedClassProperties) {
      this.append("protected def ");
      this.walk(protectedProperty.name);
      if (protectedProperty.type) {
        this.append(" : ");
        this.walkType(protectedProperty.type);
      }

      this.pushIndentation();
      this.newLine();
      this.append("@");
      this.walk(protectedProperty.name);
      this.popIndentation();
      this.newLine();
      this.append("end");

      if (Util.isNotLast(protectedProperty, this.meta.protectedClassProperties))
        this.newLine();
    }
    this.meta.protectedClassProperties = [];

    this.popIndentation();
    this.newLine();
    this.append("end");
    this.newLine();
    this.meta.currentContext = enclosingContext
  }

  private appendBlock<T extends Node & { statements: NodeArray<Statement> }>(node: T, module = false): void {
    const enclosingContext = this.meta.currentContext;
    this.meta.currentContext = Context.Block;
    this.pushIndentation();
    this.newLine();

    if (module) {
      this.append("extend self");
      this.newLine(2);
    }

    for (const statement of node.statements)
      this.walk(statement);

    this.popIndentation();
    this.meta.currentContext = enclosingContext;
  }

  private appendCallExpressionArguments(callArguments: NodeArray<Expression> | Expression[], blockParameter: boolean): void {
    let blockName: Identifier | undefined;
    if (callArguments.length > 0) {
      let providedArrowFunction = false;
      let providedBlock = false;

      this.append("(");
      for (const arg of callArguments)
        if (arg.kind === SyntaxKind.Identifier && this.meta.allFunctionIdentifiers.has((<Identifier>arg).text)) {
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
    if (this.meta.currentContext !== Context.Global) return;
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

    const methodName = typeof name === "string" ? name : name.text;
    this.meta.allFunctionIdentifiers.add(methodName);
    this.walkModifierList(modifiers?.values(), false);
    const modifierKinds = modifiers?.map(mod => mod.kind);

    const isExported = this.consumeFlag("Export");
    if (this.meta.currentContext === Context.Global && !isExported && !modifierKinds?.includes(SyntaxKind.PrivateKeyword) && !modifierKinds?.includes(SyntaxKind.StaticKeyword) && !modifierKinds?.includes(SyntaxKind.PublicKeyword))
      this.append("private ");

    this.append("def ");
    if (modifiers?.map(mod => mod.kind)?.includes(SyntaxKind.StaticKeyword))
      this.append("self.");

    if (typeof name === "string")
      this.append(name);
    else
      this.walk(name);

    if (parameters.length > 0) {
      this.append("(");
      for (const param of parameters) {
        const modifierKinds = param.modifiers?.map(mod => mod.kind) ?? [];
        if (modifierKinds.includes(SyntaxKind.PublicKeyword)) {
          this.append("@");
          this.meta.publicClassProperties.push(param);
        } else if (modifierKinds.includes(SyntaxKind.ProtectedKeyword)) {
          this.append("@");
          this.meta.protectedClassProperties.push({
            name: param.name,
            type: param.type
          });
        } else if (modifierKinds.includes(SyntaxKind.StaticKeyword))
          this.append("@@");
        else if (modifierKinds.includes(SyntaxKind.PrivateKeyword) || modifierKinds.includes(SyntaxKind.ReadonlyKeyword))
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
      this.meta.asyncFunctionIdentifiers.add(typeof name === "string" ? name : name.text);
      this.pushIndentation();
      this.newLine();
      this.append("async! do");
    }

    if (body) {
      const enclosingContext = this.meta.currentContext;
      this.meta.currentContext = Context.FunctionBody;
      this.walk(body);

      const returned = this.consumeFlag("Returned");
      if (!returned)
        this.append("return");

      this.meta.currentContext = enclosingContext;
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
        if (Constants.UNDECLARABLE_TYPE_NAMES.includes(typeText))
          this.append(to + typeText);

        break;
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
        case SyntaxKind.ProtectedKeyword: {
          this.append(isProperty ? "@" : "protected ");
          break;
        }
        case SyntaxKind.PublicKeyword: {
          this.append(isProperty ? "property " : "");
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
        case SyntaxKind.ReadonlyKeyword:
        case SyntaxKind.DeclareKeyword: {
          break;
        }

        default:
          return this.error(modifier, Util.getSyntaxName(modifier.kind), "UnhandledModifier");
      }
  }

  private walkType(type: TypeNode): void {
    switch(type.kind) {
      case SyntaxKind.UnionType: {
        const union = <UnionTypeNode>type;
        for (const type of union.types) {
          this.walkType(type);
          if (Util.isNotLast(type, union.types))
            this.append(" | ");
        }
        break;
      }
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
      case SyntaxKind.UndefinedKeyword:
      case SyntaxKind.VoidKeyword: {
        this.append("Nil");
        break;
      }
      case SyntaxKind.TypeReference: {
        const ref = <TypeReferenceNode>type;
        const typeName = this.getMappedType(ref.typeName.getText(this.sourceNode));

        this.append(typeName);
        this.walkTypeArguments(ref.typeArguments);
        if (ref.typeArguments && typeName === "Hash") {
          const [ keyType, valueType ] = ref.typeArguments;
          this.meta.currentHashKeyType = this.getMappedType(keyType.getText(this.sourceNode));
          this.meta.currentHashValueType = this.getMappedType(valueType.getText(this.sourceNode));
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
        return this.error(type, Util.getSyntaxName(type.kind), "UnhandledTypeNode");
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
    const replaced = text
      .replace(/Error/, "Exception")
      .replace(/undefined/, "nil")
      .replace(/null/, "nil");

    if (/^[A-Z_]+$/.test(replaced) && this.meta.currentContext === Context.Global)
      return replaced.toLowerCase();
    else
      return replaced;
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