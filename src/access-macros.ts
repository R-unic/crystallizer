import type CodeGenerator from "./code-generator";

const COMPLETE_REPLACE_NAMES = <const>["console.log"];
const KEY_REPLACE_NAMES = <const>["toString"];
const EXTENSION_KEY_NAMES = <const>["floor"];

type CompleteReplaceName = typeof COMPLETE_REPLACE_NAMES[number];
type KeyReplaceName = typeof KEY_REPLACE_NAMES[number];
type ExtensionKeyName = typeof EXTENSION_KEY_NAMES[number];

export default class AccessMacros {
  public constructor(
    private readonly codegen: CodeGenerator
  ) {}

  public matchesCompleteReplace(objectText: string, keyText: string): boolean {
    return COMPLETE_REPLACE_NAMES.includes(<CompleteReplaceName>`${objectText}.${keyText}`);
  }

  public completeReplace(objectText: string, keyText: string): void {
    switch(<CompleteReplaceName>`${objectText}.${keyText}`) {
      case "console.log": {
        this.codegen.append("puts");
        break;
      }
    }
  }

  public matchesKeyReplace(keyText: string): keyText is KeyReplaceName {
    return KEY_REPLACE_NAMES.includes(<KeyReplaceName>keyText);
  }

  public keyReplace(keyText: string): void {
    switch(<KeyReplaceName>keyText) {
      case "toString": {
        this.codegen.append("to_s");
        break;
      }
    }
  }

  public matchesExtension(keyText: string): keyText is ExtensionKeyName {
    return EXTENSION_KEY_NAMES.includes(<ExtensionKeyName>keyText);
  }

  public addExtension(keyText: string): void {
    switch(<ExtensionKeyName>keyText) {
      case "floor": {
        this.codegen.append(".to_i");
        break;
      }
    }
  }
}