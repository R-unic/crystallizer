import { ParameterDeclaration } from "typescript";
import Constants from "./constants";

export const enum Context {
  Global,
  SwitchStatement,
  FunctionBody,
  Block
}

export interface MetaValues extends Record<string, unknown> {
  currentContext: Context;
  currentArrayType?: string;
  currentHashKeyType?: string;
  currentHashValueType?: string;
  blockParameter?: string;
  arrowFunctionName?: string;
  publicClassProperties: ParameterDeclaration[];
  allFunctionIdentifiers: string[];
  asyncFunctionIdentifiers: string[];
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
  allFunctionIdentifiers: [...Constants.REVERSE_ARGS_GLOBAL_FUNCTIONS, "parseInt", "parseFloat"],
  asyncFunctionIdentifiers: [],
  spreadParameter: false
  // bindingCount: 0
};