import { SyntaxKind } from "typescript";

namespace Constants {
  export const TYPE_HELPER_FILENAME = "crystal.d.ts";
  export const UNDECLARABLE_TYPE_NAMES = ["i32", "f32", "u32", "i64", "f64", "u64"];
  export const UNCASTABLE_TYPES = [SyntaxKind.UnknownKeyword, SyntaxKind.AnyKeyword];
  export const CLASS_MODIFIERS = [SyntaxKind.PublicKeyword, SyntaxKind.PrivateKeyword, SyntaxKind.ProtectedKeyword, SyntaxKind.ReadonlyKeyword];
  export const REVERSE_ARGS_GLOBAL_FUNCTIONS = ["setTimeout", "setInterval"];
  export const REVERSE_ARGS_CLASS_FUNCTIONS = ["reduce", "reduceRight"];
}

export default Constants;