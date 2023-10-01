import { Lexer } from "./lexer";

const lexer = new Lexer("1 + (x * y)");
console.log(lexer.tokenize());