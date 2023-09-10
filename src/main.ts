import { mkdirSync, readFileSync, writeFileSync } from "fs";
import { exec } from "child_process";
import { argv } from "process";
import { boolean, command, flag, positional, run, string } from "cmd-ts";
import path from "path";
import CLI from "./cli";

let sliceIndex = 1;
let [rootDirectory] = argv.slice(1);
if (rootDirectory.endsWith(".js"))
  sliceIndex = 2

const app = command({
  name: "Crystallizer",
  args: {
    rootDirectory: positional({ type: string, displayName: "Root directory", description: "Path to the main directory of your project" }),
    init: flag({ type: boolean, long: "init", short: "i", description: "Intialize a new Crystallizer project" })
  },
  handler: ({ rootDirectory, init }) => {
    if (init) {
      exec("git init", console.log);
      mkdirSync(path.join(rootDirectory, "src"));
      mkdirSync(path.join(rootDirectory, "dist"));

      const defaultTsConfigJSON = readFileSync(path.join(__dirname, "..", "default_tsconfig.json"));
      writeFileSync(path.join(rootDirectory, "tsconfig.json"), defaultTsConfigJSON);
      console.log("Successfully initialized a Crystallizer project!".green)
    } else {
      const cli = new CLI(rootDirectory ?? path.relative(path.dirname(__dirname), process.cwd()));
      cli.runAll();
    }
  }
});

run(app, argv.slice(sliceIndex));