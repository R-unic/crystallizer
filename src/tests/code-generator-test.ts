import { describe } from "mocha";
import ts from "typescript";
import "should";

import CodeGenerator from "../code-generator"

const TAB = " ".repeat(4);
function createTestCodeGen(sourceCode: string): CodeGenerator {
  const sourceFile = ts.createSourceFile(__filename, sourceCode, ts.ScriptTarget.ES2015);
  return new CodeGenerator(sourceFile, { testRun: true });
}

describe("CodeGenerator#generate", () => {
  describe("should transpile literals", () => {
    it("basic datatypes", () => {
      {
        const codeGen = createTestCodeGen("69.420");
        const crystalCode = codeGen.generate();
        crystalCode.should.equal("69.42");
      }
      {
        const codeGen = createTestCodeGen("'hello world!'");
        const crystalCode = codeGen.generate();
        crystalCode.should.equal('"hello world!"');
      }
      {
        const codeGen = createTestCodeGen("false && true");
        const crystalCode = codeGen.generate();
        crystalCode.should.equal('false && true');
      }
    });
    it("arrays", () => {
      const codeGen = createTestCodeGen("const a: i32[] = [1,2,3]");
      const crystalCode = codeGen.generate();
      crystalCode.should.equal("a : TsArray(Int32) = TsArray(Int32).new([1, 2, 3] of Int32)");
    });
    it("objects", () => {
      const codeGen = createTestCodeGen("const t = {epic: true, typescript: false}");
      const crystalCode = codeGen.generate();
      crystalCode.should.equal(`t = {\n${TAB}"epic" => true,\n${TAB}"typescript" => false\n}`);
    });
  });
  describe("should transpile functions", () => {
    it("without generics", () => {
      const codeGen = createTestCodeGen([
        "function saySomething(): void {",
        TAB + "console.log(\"something\");",
        "}"
      ].join("\n"));

      const crystalCode = codeGen.generate();
      crystalCode.should.equal([
        "def saySomething : Nil",
        TAB + "puts(\"something\")",
        "end"
      ].join("\n"));
    });
    it("with generics", () => {
      const codeGen = createTestCodeGen([
        "function printValue<T>(value: T): void {",
        TAB + "console.log(value);",
        "}"
      ].join("\n"));

      const crystalCode = codeGen.generate();
      crystalCode.should.equal([
        "def printValue(value : T) : Nil forall T",
        TAB + "puts(value)",
        "end"
      ].join("\n"));
    });
  });
});