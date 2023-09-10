import { mkdirSync, readFileSync, writeFileSync } from "fs";
import { exec } from "child_process";
import { argv } from "process";
import { boolean, command, flag, positional, run, string } from "cmd-ts";
import path from "path";

import Util from "./utility"
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
    if (init)
      initializeProject(rootDirectory);
    else
      compile(rootDirectory);
  }
});

function compile(rootDirectory: string) {
  const cli = new CLI(rootDirectory ?? path.relative(path.dirname(__dirname), process.cwd()));
  cli.runAll();
}

function initializeProject(rootDirectory: string) {
  exec(`git init`, { cwd: rootDirectory }, (error, stdout, stderr) => {
    if (error)
      throw error;
    if (stderr)
      console.log(stderr);
    if (stdout)
      console.log(stdout);
  });

  const sourceDir = path.join(rootDirectory, "src");
  const emitDir = path.join(rootDirectory, "dist");
  if (!Util.Files.isDirectory(sourceDir))
    mkdirSync(sourceDir);
  if (!Util.Files.isDirectory(emitDir))
    mkdirSync(emitDir);

  const defaultTsConfigJSON = readFileSync(path.join(__dirname, "..", "default_tsconfig.json"));
  writeFileSync(path.join(rootDirectory, "tsconfig.json"), defaultTsConfigJSON);
  console.log("Successfully initialized a Crystallizer project!".green);
}

run(app, argv.slice(sliceIndex));