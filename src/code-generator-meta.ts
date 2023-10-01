import { BindingName, ParameterDeclaration, PropertyName, TypeNode } from "typescript";
import Constants from "./constants";




export const enum Context {
  Global,
  Block,
  FunctionBody,
  SwitchStatement,
  EnumBody,
  ClassBody,
  TypeParameters
}

export interface MetaValues extends Record<string, unknown> {
  currentContext: Context;
  currentArrayType?: string;
  currentHashKeyType?: string;
  currentHashValueType?: string;
  blockParameter?: string;
  arrowFunctionName?: string;
  publicClassProperties: ParameterDeclaration[];
  protectedClassProperties: { name: BindingName | PropertyName; type?: TypeNode }[];
  allFunctionIdentifiers: Set<string>;
  asyncFunctionIdentifiers: Set<string>;
  spreadParameter: boolean;
  // bindingCount: number;
}

export const DEFAULT_META: MetaValues = {
  currentContext: Context.Global,
  currentArrayType: undefined,
  currentHashKeyType: undefined,
  currentHashValueType: undefined,
  blockParameter: undefined,
  arrowFunctionName: undefined,
  publicClassProperties: [],
  protectedClassProperties: [],
  allFunctionIdentifiers: new Set<string>([...Constants.REVERSE_ARGS_GLOBAL_FUNCTIONS, "parseInt", "parseFloat"]),
  asyncFunctionIdentifiers: new Set<string>(),
  spreadParameter: false
  // bindingCount: 0
};