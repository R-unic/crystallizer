import path from "path";
import CLI from "./cli";

const cli = new CLI(process.argv[2] ?? path.relative(path.dirname(__dirname), process.cwd()))
cli.runAll();