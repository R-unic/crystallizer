import type CodeGenerator from "./code-generator";

const COMPLETE_REPLACE_NAMES = <const>["console.log"];
const KEY_REPLACE_NAMES = <const>["toString"];
const EXTENSION_KEY_NAMES = <const>["floor"];

type CompleteReplaceName = typeof COMPLETE_REPLACE_NAMES[number];
type KeyReplaceName = typeof KEY_REPLACE_NAMES[number];
type ExtensionKeyName = typeof EXTENSION_KEY_NAMES[number];

/**
 * This class is responsible for "macro-ing" different parts of object accessing.
 */
export default class AccessMacros {
  public constructor(
    private readonly codegen: CodeGenerator
  ) {}

  /**
   * Returns whether or not this access expression is one that should be completely replaced
   * @param objectText The text of the object being accessed
   * @param keyText The text of the key accessing the object
   */
  public matchesCompleteReplace(objectText: string, keyText: string): boolean {
    return COMPLETE_REPLACE_NAMES.includes(<CompleteReplaceName>`${objectText}.${keyText}`);
  }

  /**
   * Takes an access expression (in TypeScript) and completely replaces it with it's "macro"
   *
   * **Note:** This function should only be called with access expressions you know are in the complete replace list. Nothing will happen if it isn't, not even an error
   * @param objectText
   * @param keyText
   */
  public completeReplace(objectText: string, keyText: string): void {
    switch(<CompleteReplaceName>`${objectText}.${keyText}`) {
      case "console.log": {
        this.codegen.append("puts");
        break;
      }
    }
  }

  /**
   * Returns whether or not this is a key that should be replaced
   * @param keyText The text of the key accessing the object
   */
  public matchesKeyReplace(keyText: string): keyText is KeyReplaceName {
    return KEY_REPLACE_NAMES.includes(<KeyReplaceName>keyText);
  }

  /**
   * Takes a key from an access expression (in TypeScript) and completely replaces it with it's "macro"
   *
   * **Note:** This function should only be called with keys of access expressions, otherwise you could be replacing the wrong text
   * @param objectText
   * @param keyText
   */
  public keyReplace(keyText: string): void {
    switch(<KeyReplaceName>keyText) {
      case "toString": {
        this.codegen.append("to_s");
        break;
      }
    }
  }

  /**
   * Returns whether or not this is a key that should be extended with more text
   * @param keyText The text of the key accessing the object
   */
  public matchesExtension(keyText: string): keyText is ExtensionKeyName {
    return EXTENSION_KEY_NAMES.includes(<ExtensionKeyName>keyText);
  }

  /**
   * Takes a key from an access expression **(in Crystal!!!)** and adds it's "macro" onto the end of it
   *
   * For example: `n.floor` becomes `n.floor.to_i`
   *
   * This is because a number that is rounded down will always be an integer, but Crystal keeps it as a float for type compatibility
   *
   * **Note:** This function should only be called with keys of access expressions, otherwise you could be replacing the wrong text
   * @param objectText
   * @param keyText
   */
  public addExtension(keyText: string): void {
    switch(<ExtensionKeyName>keyText) {
      case "floor": {
        this.codegen.append(".to_i");
        break;
      }
    }
  }
}