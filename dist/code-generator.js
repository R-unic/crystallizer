"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const tslib_1 = require("tslib");
const typescript_1 = require("typescript");
const fs_1 = require("fs");
const os_1 = require("os");
const child_process_1 = require("child_process");
const path_1 = tslib_1.__importDefault(require("path"));
const utility_1 = tslib_1.__importDefault(require("./utility"));
const logger_1 = tslib_1.__importDefault(require("./logger"));
const string_builder_1 = tslib_1.__importDefault(require("./string-builder"));
const type_map_1 = tslib_1.__importDefault(require("./type-map"));
const binary_operator_map_1 = tslib_1.__importDefault(require("./binary-operator-map"));
const UNDECLARABLE_TYPE_NAMES = ["i32", "f32", "u32", "i64", "f64", "u64"];
const UNCASTABLE_TYPES = [typescript_1.SyntaxKind.UnknownKeyword, typescript_1.SyntaxKind.AnyKeyword];
const CLASS_MODIFIERS = [typescript_1.SyntaxKind.PublicKeyword, typescript_1.SyntaxKind.PrivateKeyword, typescript_1.SyntaxKind.ProtectedKeyword, typescript_1.SyntaxKind.ReadonlyKeyword];
const SNAKE_CASE_GLOBALS = ["setTimeout", "setInterval"];
const TYPE_HELPER_FILENAME = "crystal.d.ts";
const DEFAULT_META = {
    currentArrayType: undefined,
    currentHashKeyType: undefined,
    currentHashValueType: undefined,
    publicClassProperties: [],
    allFunctionIdentifiers: [],
    asyncFunctionIdentifiers: [],
    inGlobalScope: true
};
class CodeGenerator extends string_builder_1.default {
    constructor(sourceNode, options) {
        super();
        this.sourceNode = sourceNode;
        this.options = options;
        this.flags = [];
        this.meta = DEFAULT_META;
    }
    generate() {
        this.handleRuntimeLib();
        this.walkChildren(this.sourceNode);
        return this.generated.trim();
    }
    handleRuntimeLib() {
        if (!this.options.outDir)
            return;
        if (this.options.testRun)
            return;
        const projectRuntimeLibPath = path_1.default.join(this.options.outDir, "runtime_lib");
        if (utility_1.default.Files.isDirectory(projectRuntimeLibPath)) {
            const rf = {
                force: true,
                recursive: true
            };
            (0, fs_1.rmSync)(projectRuntimeLibPath, rf);
            (0, fs_1.rmSync)(path_1.default.join(projectRuntimeLibPath, "lib"), rf);
            (0, fs_1.rmSync)(path_1.default.join(projectRuntimeLibPath, "shard.lock"), rf);
        }
        utility_1.default.Files.copyDirectory(path_1.default.join(__dirname, "../runtime_lib"), projectRuntimeLibPath);
        const runtimeLibShard = path_1.default.join(projectRuntimeLibPath, "shard.yml");
        const crystalTypeHelpers = path_1.default.join(projectRuntimeLibPath, TYPE_HELPER_FILENAME);
        utility_1.default.Files.moveFile(runtimeLibShard, path_1.default.join(this.options.outDir, "shard.yml"));
        utility_1.default.Files.moveFile(crystalTypeHelpers, path_1.default.join(this.options.outDir, TYPE_HELPER_FILENAME));
        const isWindows = (0, os_1.platform)() === "win32";
        (0, child_process_1.exec)((isWindows ? "where.exe" : "which") + " shards", (error, stdout, stderr) => {
            if (error || stderr)
                return console.error(`Error: ${error?.message ? error.message + stderr : stderr}`);
            const outParts = stdout.split("shards: ");
            const shardsExecutable = outParts[outParts.length - 1].trim();
            (0, child_process_1.exec)(`"${path_1.default.resolve(shardsExecutable)}" install`, { cwd: this.options.outDir }, (error, _, stderr) => {
                if (error || stderr)
                    return console.error(`Error: ${error?.message ? error.message + stderr : stderr}`);
            });
        });
        this.append(`require "./runtime_lib/*"\n\n`);
    }
    walk(node) {
        switch (node.kind) {
            case typescript_1.SyntaxKind.QualifiedName: {
                const { left, right } = node;
                this.walk(left);
                this.append(".");
                this.walk(right);
                break;
            }
            case typescript_1.SyntaxKind.Identifier: {
                const { text } = node;
                const isTypeIdent = this.consumeFlag("TypeIdent");
                this.append(isTypeIdent ? this.getMappedType(text) : text);
                break;
            }
            case typescript_1.SyntaxKind.VariableDeclaration: {
                const declaration = node;
                this.walk(declaration.name);
                if (declaration.type) {
                    this.append(" : ");
                    this.walkType(declaration.type);
                }
                if (declaration.initializer) {
                    this.append(" = ");
                    this.walk(declaration.initializer);
                }
                this.newLine();
                break;
            }
            case typescript_1.SyntaxKind.VariableDeclarationList: {
                const declarationList = node;
                this.walkFlag(declarationList.flags);
                for (const declaration of declarationList.declarations)
                    this.walk(declaration);
                break;
            }
            case typescript_1.SyntaxKind.VariableStatement: {
                const statement = node;
                this.walkModifiers(statement);
                this.walk(statement.declarationList);
                break;
            }
            case typescript_1.SyntaxKind.TypeAliasDeclaration: {
                const alias = node;
                if (UNDECLARABLE_TYPE_NAMES.includes(alias.name.getText(this.sourceNode)))
                    break;
                this.walkModifiers(alias);
                this.append("alias ");
                this.walk(alias.name);
                this.append(" = ");
                this.walkType(alias.type);
                this.newLine();
                break;
            }
            case typescript_1.SyntaxKind.ExpressionWithTypeArguments: {
                const typedExpression = node;
                this.walk(typedExpression.expression);
                if (typedExpression.typeArguments) {
                    this.append("(");
                    for (const typeArg of typedExpression.typeArguments) {
                        this.walkType(typeArg);
                        if (utility_1.default.isNotLast(typeArg, typedExpression.typeArguments))
                            this.append(", ");
                    }
                    this.append(")");
                }
                break;
            }
            case typescript_1.SyntaxKind.ParenthesizedExpression: {
                const parenthesized = node;
                this.append("(");
                this.walk(parenthesized.expression);
                this.append(")");
                break;
            }
            case typescript_1.SyntaxKind.BinaryExpression: {
                const binary = node;
                const operatorText = binary.operatorToken.getText(this.sourceNode);
                this.walk(binary.left);
                if (operatorText === "instanceof")
                    this.append(".class <= ");
                else
                    this.append(` ${this.getMappedBinaryOperator(operatorText)} `);
                this.walk(binary.right);
                break;
            }
            case typescript_1.SyntaxKind.PrefixUnaryExpression: {
                const unary = node;
                this.append(utility_1.default.syntaxKindToText(unary.operator));
                this.walk(unary.operand);
                break;
            }
            case typescript_1.SyntaxKind.PostfixUnaryExpression: {
                const postfix = node;
                this.walk(postfix.operand);
                this.append(" ");
                if (postfix.operator == typescript_1.SyntaxKind.PlusPlusToken)
                    this.append("+");
                else
                    this.append("-");
                this.append("= 1");
                break;
            }
            case typescript_1.SyntaxKind.PropertyAccessExpression: {
                const access = node;
                const objectText = access.expression.getText(this.sourceNode);
                const propertyNameText = access.name.getText(this.sourceNode);
                if (objectText === "console")
                    if (propertyNameText === "log") {
                        this.append("puts");
                        break;
                    }
                this.walk(access.expression);
                this.append(access.expression.kind === typescript_1.SyntaxKind.ThisKeyword ? "" : ".");
                this.walk(access.name);
                break;
            }
            case typescript_1.SyntaxKind.ElementAccessExpression: {
                const access = node;
                if (access.expression.kind === typescript_1.SyntaxKind.ThisKeyword)
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
            case typescript_1.SyntaxKind.TypeAssertionExpression:
            case typescript_1.SyntaxKind.AsExpression: {
                const cast = node;
                this.walk(cast.expression);
                this.appendTypeCastMethod(cast.type);
                break;
            }
            case typescript_1.SyntaxKind.CallExpression: {
                const call = node;
                let callArguments = call.arguments;
                if (call.expression.kind === typescript_1.SyntaxKind.Identifier) {
                    const functionName = call.expression.text;
                    if (this.meta.inGlobalScope && this.meta.asyncFunctionIdentifiers.includes(functionName))
                        this.append("await ");
                    if (SNAKE_CASE_GLOBALS.includes(call.expression.text)) {
                        this.append(utility_1.default.toSnakeCase(functionName));
                        if (functionName === "setTimeout" || functionName === "setInterval")
                            callArguments = callArguments.map((_, index, array) => array[array.length - 1 - index]);
                    }
                    else
                        this.walk(call.expression);
                }
                else
                    this.walk(call.expression);
                let blockName;
                if (callArguments.length > 0) {
                    let isArrowFunction = false;
                    this.append("(");
                    for (const arg of callArguments)
                        if (arg.kind === typescript_1.SyntaxKind.Identifier && this.meta.allFunctionIdentifiers.includes(arg.text))
                            blockName = arg;
                        else if (arg.kind === typescript_1.SyntaxKind.ArrowFunction) {
                            isArrowFunction = true;
                            this.popLastPart();
                            this.walk(arg);
                            break;
                        }
                        else {
                            this.walk(arg);
                            if (utility_1.default.isNotLast(arg, callArguments))
                                this.append(", ");
                        }
                    if (blockName)
                        this.popLastPart();
                    if (!isArrowFunction)
                        this.append(")");
                }
                if (blockName) {
                    this.append(" { ");
                    this.walk(blockName);
                    this.append("() }");
                }
                break;
            }
            case typescript_1.SyntaxKind.NewExpression: {
                const newExpression = node;
                this.walk(newExpression.expression);
                this.append(".new");
                if (newExpression.arguments && newExpression.arguments.length > 0) {
                    this.append("(");
                    for (const arg of newExpression.arguments) {
                        this.walk(arg);
                        if (utility_1.default.isNotLast(arg, newExpression.arguments))
                            this.append(", ");
                    }
                    this.append(")");
                }
                break;
            }
            case typescript_1.SyntaxKind.AwaitExpression: {
                const awaitExpression = node;
                this.append("await ");
                this.walk(awaitExpression.expression);
                break;
            }
            case typescript_1.SyntaxKind.ReturnStatement: {
                const statement = node;
                this.pushFlag("Returned");
                this.append("return");
                if (statement.expression) {
                    this.append(" ");
                    this.walk(statement.expression);
                }
                this.newLine();
                break;
            }
            case typescript_1.SyntaxKind.Parameter: {
                const param = node;
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
            case typescript_1.SyntaxKind.FunctionDeclaration: {
                const declaration = node;
                if (!declaration.name)
                    return this.error(declaration, "Anonymous functions not supported yet.", "UnsupportedAnonymousFunctions");
                this.meta.allFunctionIdentifiers.push(declaration.name.text);
                this.appendMethod(declaration.name, declaration.parameters, declaration.modifiers, declaration.type, declaration.typeParameters, declaration.body);
                this.newLine();
                break;
            }
            case typescript_1.SyntaxKind.ArrowFunction: {
                const arrowFunction = node;
                const codegen = this;
                function appendParamNameList(arrowFunction) {
                    for (const parameter of arrowFunction.parameters) {
                        codegen.walk(parameter.name);
                        if (utility_1.default.isNotLast(parameter, arrowFunction.parameters))
                            codegen.append(", ");
                    }
                }
                this.append(" do");
                if (arrowFunction.parameters.length > 0) {
                    this.append(" |");
                    appendParamNameList(arrowFunction);
                    this.append("|");
                }
                this.pushIndentation();
                this.newLine();
                this.walk(arrowFunction.body);
                this.popIndentation();
                this.newLine();
                this.append("end");
                break;
            }
            case typescript_1.SyntaxKind.Constructor: {
                const constructor = node;
                this.appendMethod("initialize", constructor.parameters, constructor.modifiers, constructor.type, constructor.typeParameters, constructor.body);
                break;
            }
            case typescript_1.SyntaxKind.ThisKeyword: {
                this.append("@");
                break;
            }
            case typescript_1.SyntaxKind.ClassDeclaration: {
                const declaration = node;
                this.append("class ");
                if (declaration.name)
                    this.walk(declaration.name);
                else
                    this.append(utility_1.default.toPascalCase(path_1.default.basename(this.sourceNode.fileName)));
                if (declaration.typeParameters) {
                    this.append("(");
                    for (const typeParam of declaration.typeParameters)
                        this.walk(typeParam.name);
                    this.append(")");
                }
                const mixins = [];
                for (const heritageClause of declaration.heritageClauses ?? [])
                    if (heritageClause.token == typescript_1.SyntaxKind.ExtendsKeyword) {
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
                for (const member of declaration.members)
                    this.walk(member);
                if (this.meta.publicClassProperties.length > 0)
                    this.newLine();
                for (const publicProperty of this.meta.publicClassProperties) {
                    this.append("property ");
                    this.walk(publicProperty.name);
                    if (publicProperty.type) {
                        this.append(" : ");
                        this.walkType(publicProperty.type);
                    }
                    if (utility_1.default.isNotLast(publicProperty, this.meta.publicClassProperties))
                        this.newLine();
                }
                this.meta.publicClassProperties = [];
                this.popIndentation();
                this.newLine();
                this.append("end");
                this.newLine();
                break;
            }
            case typescript_1.SyntaxKind.PropertySignature: {
                const signature = node;
                this.walkModifiers(signature);
                this.walk(signature.name);
                if (signature.type) {
                    this.append(" : ");
                    this.walkType(signature.type);
                }
                break;
            }
            case typescript_1.SyntaxKind.PropertyDeclaration: {
                const declaration = node;
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
            case typescript_1.SyntaxKind.MethodSignature: {
                const signature = node;
                this.appendMethod(signature.name, signature.parameters, signature.modifiers, signature.type, signature.typeParameters);
                break;
            }
            case typescript_1.SyntaxKind.MethodDeclaration: {
                const declaration = node;
                this.appendMethod(declaration.name, declaration.parameters, declaration.modifiers, declaration.type, declaration.typeParameters, declaration.body);
                break;
            }
            case typescript_1.SyntaxKind.ForOfStatement: {
                const forOfStatement = node;
                this.walk(forOfStatement.expression);
                this.append(".for_each do |");
                const declarationList = forOfStatement.initializer;
                this.walk(declarationList.declarations[0].name);
                this.append("|");
                if (forOfStatement.statement.kind !== typescript_1.SyntaxKind.Block) {
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
            case typescript_1.SyntaxKind.ForStatement: {
                const forStatement = node;
                if (forStatement.initializer)
                    this.walk(forStatement.initializer);
                this.append("while ");
                if (forStatement.condition)
                    this.walk(forStatement.condition);
                else
                    this.append("true");
                const bodyIsBlock = forStatement.statement.kind !== typescript_1.SyntaxKind.Block;
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
            case typescript_1.SyntaxKind.WhileStatement: {
                const whileStatement = node;
                const isUnary = whileStatement.expression.kind === typescript_1.SyntaxKind.PrefixUnaryExpression;
                const condition = whileStatement.expression;
                const conditionInverted = (condition).operator === typescript_1.SyntaxKind.ExclamationToken;
                if (isUnary && conditionInverted)
                    this.append("until ");
                else
                    this.append("while ");
                this.walk(isUnary ? condition.operand : condition);
                if (whileStatement.statement.kind !== typescript_1.SyntaxKind.Block) {
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
            case typescript_1.SyntaxKind.IfStatement: {
                const ifStatement = node;
                const isUnary = ifStatement.expression.kind === typescript_1.SyntaxKind.PrefixUnaryExpression;
                const condition = ifStatement.expression;
                const conditionInverted = isUnary && (condition).operator === typescript_1.SyntaxKind.ExclamationToken;
                if (conditionInverted)
                    this.append("unless ");
                else
                    this.append("if ");
                this.walk(conditionInverted ? condition.operand : condition);
                if (ifStatement.thenStatement.kind !== typescript_1.SyntaxKind.Block) {
                    this.pushIndentation();
                    this.newLine();
                    this.popIndentation();
                }
                this.walk(ifStatement.thenStatement);
                if (ifStatement.elseStatement) {
                    this.newLine();
                    this.append(ifStatement.elseStatement.kind === typescript_1.SyntaxKind.IfStatement ? "els" : "else");
                    if (ifStatement.elseStatement.kind !== typescript_1.SyntaxKind.Block) {
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
            case typescript_1.SyntaxKind.ExpressionStatement: {
                this.walk(node.expression);
                this.newLine();
                break;
            }
            case typescript_1.SyntaxKind.ObjectLiteralExpression: {
                const object = node;
                this.append("{");
                if (object.properties.length > 0) {
                    this.pushIndentation();
                    this.newLine();
                }
                for (const property of object.properties) {
                    const [name, _, value] = property.getChildren(this.sourceNode);
                    if (name.kind == typescript_1.SyntaxKind.Identifier)
                        this.append('"');
                    this.walk(name);
                    if (name.kind == typescript_1.SyntaxKind.Identifier)
                        this.append('"');
                    this.append(" => ");
                    this.walk(value);
                    if (utility_1.default.isNotLast(property, object.properties)) {
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
            case typescript_1.SyntaxKind.ArrayLiteralExpression: {
                const array = node;
                if (!this.meta.currentArrayType)
                    return this.error(array, "All arrays must have a type annotation.", "UnannotatedArray");
                const elementType = this.getMappedType(this.meta.currentArrayType);
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
            case typescript_1.SyntaxKind.StringLiteral: {
                this.append(`"${node.text}"`);
                break;
            }
            case typescript_1.SyntaxKind.TrueKeyword: {
                this.append("true");
                break;
            }
            case typescript_1.SyntaxKind.FalseKeyword: {
                this.append("false");
                break;
            }
            case typescript_1.SyntaxKind.FirstLiteralToken: {
                this.append(node.text);
                break;
            }
            case typescript_1.SyntaxKind.Block: {
                const enclosingIsInScope = this.meta.inGlobalScope;
                this.meta.inGlobalScope = false;
                this.pushIndentation();
                this.newLine();
                for (const statement of node.statements)
                    this.walk(statement);
                this.popIndentation();
                this.meta.inGlobalScope = enclosingIsInScope;
                break;
            }
            case typescript_1.SyntaxKind.SyntaxList: {
                this.walkChildren(node);
                break;
            }
            case typescript_1.SyntaxKind.LabeledStatement: {
                break;
            }
            case typescript_1.SyntaxKind.EndOfFileToken: {
                break;
            }
            default:
                throw new Error(`Unhandled AST syntax: ${utility_1.default.getSyntaxName(node.kind)}`);
        }
    }
    appendMethod(name, parameters, modifiers, type, typeParameters, body) {
        this.walkModifierList(modifiers?.values(), false);
        this.append("def ");
        const isStatic = modifiers?.map(mod => mod.kind)?.includes(typescript_1.SyntaxKind.StaticKeyword);
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
                const isPublic = modifierTypes.includes(typescript_1.SyntaxKind.PublicKeyword);
                const isStatic = modifierTypes.includes(typescript_1.SyntaxKind.StaticKeyword);
                if (isPublic)
                    this.meta.publicClassProperties.push(param);
                if (CLASS_MODIFIERS.includes(modifierTypes[0]))
                    if (isStatic)
                        this.append("@@");
                    else
                        this.append("@");
                this.walk(param);
                if (utility_1.default.isNotLast(param, parameters))
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
                if (utility_1.default.isNotLast(typeParam, typeParameters))
                    this.append(", ");
            }
        }
        const isAsync = this.consumeFlag("Async");
        if (isAsync)
            this.meta.asyncFunctionIdentifiers.push(typeof name === "string" ? name : name.text);
        if (body) {
            if (isAsync) {
                this.pushIndentation();
                this.newLine();
                this.append("async! do");
            }
            this.walk(body);
            const returned = this.consumeFlag("Returned");
            if (!returned)
                this.append("return");
            else
                this.popLastPart();
            if (isAsync) {
                this.newLine();
                this.append("end");
                this.popIndentation();
            }
        }
        this.newLine();
        this.append("end");
    }
    appendTypeCastMethod(type) {
        if (UNCASTABLE_TYPES.includes(type.kind))
            return;
        this.append(".");
        const to = "to_";
        switch (type.kind) {
            case typescript_1.SyntaxKind.NumberKeyword: {
                this.append(to + "f64");
                break;
            }
            case typescript_1.SyntaxKind.StringKeyword: {
                this.append(to + "s");
                break;
            }
            case typescript_1.SyntaxKind.TypeReference: {
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
    walkModifiers(container, isProperty = true) {
        this.walkModifierList(container.modifiers?.values(), isProperty);
    }
    walkModifierList(modifiers, isProperty = true) {
        for (const modifier of modifiers ?? [].values())
            switch (modifier.kind) {
                case typescript_1.SyntaxKind.PrivateKeyword: {
                    this.append(isProperty ? "@" : "private ");
                    break;
                }
                case typescript_1.SyntaxKind.PublicKeyword: {
                    this.append(isProperty ? "property " : "");
                    break;
                }
                case typescript_1.SyntaxKind.ReadonlyKeyword: {
                    this.append("getter ");
                    break;
                }
                case typescript_1.SyntaxKind.StaticKeyword: {
                    this.append(isProperty ? "@@" : "");
                    break;
                }
                case typescript_1.SyntaxKind.AsyncKeyword: {
                    this.pushFlag("Async");
                    break;
                }
                case typescript_1.SyntaxKind.DeclareKeyword: {
                    break;
                }
                default: {
                    console.error(`Unhandled modifier: ${utility_1.default.getSyntaxName(modifier.kind)}`);
                    process.exit(1);
                }
            }
    }
    walkType(type) {
        switch (type.kind) {
            case typescript_1.SyntaxKind.ArrayType: {
                const arrayType = type;
                this.append("TsArray(");
                this.walkType(arrayType.elementType);
                this.append(")");
                this.meta.currentArrayType = this.getMappedType(arrayType.elementType.getText(this.sourceNode));
                break;
            }
            case typescript_1.SyntaxKind.NumberKeyword: {
                this.append("Num");
                break;
            }
            case typescript_1.SyntaxKind.StringKeyword: {
                this.append("String");
                break;
            }
            case typescript_1.SyntaxKind.BooleanKeyword: {
                this.append("Bool");
                break;
            }
            case typescript_1.SyntaxKind.VoidKeyword: {
                this.append("Nil");
                break;
            }
            case typescript_1.SyntaxKind.TypeReference: {
                const ref = type;
                const typeName = this.getMappedType(ref.typeName.getText(this.sourceNode));
                this.append(typeName);
                if (ref.typeArguments) {
                    this.append("(");
                    for (const typeArg of ref.typeArguments) {
                        this.walkType(typeArg);
                        if (utility_1.default.isNotLast(typeArg, ref.typeArguments))
                            this.append(", ");
                    }
                    this.append(")");
                    if (typeName === "Hash") {
                        const [keyType, valueType] = ref.typeArguments;
                        this.meta.currentHashKeyType = this.getMappedType(keyType.getText(this.sourceNode));
                        this.meta.currentHashValueType = this.getMappedType(valueType.getText(this.sourceNode));
                    }
                }
                break;
            }
            case typescript_1.SyntaxKind.TypeKeyword: {
                this.append(this.getMappedType(type.getText(this.sourceNode)));
                break;
            }
            case typescript_1.SyntaxKind.AnyKeyword:
            case typescript_1.SyntaxKind.UnknownKeyword: {
                if (this.peekLastPart() === " : ")
                    this.popLastPart();
                break;
            }
            default:
                throw new Error(`Unhandled type node: ${utility_1.default.getSyntaxName(type.kind)}`);
        }
    }
    walkChildren(node) {
        for (const child of node.getChildren())
            this.walk(child);
    }
    walkFlag(flag) {
        if (flag == typescript_1.NodeFlags.Const)
            return;
        this.pushFlag(typescript_1.NodeFlags[flag]);
    }
    pushFlag(flag) {
        if (this.flags.includes(flag))
            return;
        this.flags.push(flag);
    }
    getMappedType(text) {
        let [typeName, genericList] = text.replace(">", "").split("<", 1);
        const generics = (genericList ?? "")
            .split(",")
            .map(s => s.trim())
            .filter(s => s !== "");
        typeName = typeName.trim();
        let mappedType = type_map_1.default.get(typeName) ?? typeName;
        if (generics.length > 0) {
            mappedType += "(";
            mappedType += generics.join(", ");
            mappedType += ")";
        }
        return mappedType;
    }
    getMappedBinaryOperator(text) {
        return binary_operator_map_1.default.get(text) ?? text;
    }
    consumeFlag(flag) {
        const lastFlag = this.flags[this.flags.length - 1];
        const matched = flag == lastFlag;
        if (matched)
            this.flags.pop();
        return matched;
    }
    resetMeta(key) {
        if (typeof DEFAULT_META[key] !== "undefined")
            return;
        this.meta[key] = undefined;
    }
    error(node, message, errorType) {
        const { line, character } = (0, typescript_1.getLineAndCharacterOfPosition)(this.sourceNode, node.getStart(this.sourceNode));
        logger_1.default.error(this.sourceNode, message, line, character, `Crystallizer.${errorType}`, node.getText(this.sourceNode));
        process.exit(1);
    }
}
exports.default = CodeGenerator;
