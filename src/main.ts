import CLI from "./cli";

const cli = new CLI(process.argv[2] ?? process.cwd())
cli.runAll();