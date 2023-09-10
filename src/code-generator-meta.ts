import { ParameterDeclaration } from "typescript";
import Constants from "./constants";

export interface MetaValues extends Record<string, unknown> {
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
  inSwitchStatement: boolean;
  inBlock: boolean;
  spreadParameter: boolean;
  // bindingCount: number;
}

export const DEFAULT_META: MetaValues = {
  currentArrayType: undefined,
  currentHashKeyType: undefined,
  currentHashValueType: undefined,
  currentlyDeclaring: undefined,
  blockParameter: undefined,
  arrowFunctionName: undefined,
  publicClassProperties: [],
  allFunctionIdentifiers: [...Constants.REVERSE_ARGS_GLOBAL_FUNCTIONS, "parseInt", "parseFloat"],
  asyncFunctionIdentifiers: [],
  inGlobalScope: true,
  inSwitchStatement: false,
  spreadParameter: false,
  inBlock: false,
  // bindingCount: 0
};