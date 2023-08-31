import { readFileSync } from "fs";
import * as ts from "typescript";
import Crystallizer from "./compiler";

// add config and such
// and remove file option
const fileName = process.argv[2];
const sourceFile = ts.createSourceFile(
  fileName,
  readFileSync(fileName).toString(),
  ts.ScriptTarget.ES2015,
);

const crystallizer = new Crystallizer(sourceFile);
crystallizer.compile()