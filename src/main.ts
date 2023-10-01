import { mkdirSync, readFileSync, writeFileSync } from "fs";
import { exec } from "child_process";
import { argv } from "process";
import { boolean, command, flag, optional, positional, run, string } from "cmd-ts";
import path from "path";

import Util from "./utility"
import FileRunner from "./file-runner";

let sliceIndex = 1;
let [rootDirectory] = argv.slice(1);
if (rootDirectory.endsWith(".js"))
  sliceIndex = 2

const app = command({
  name: "crystallizer",
  args: {
    rootDirectory: positional({ type: optional(string), displayName: "root directory", description: "Path to the main directory of your project" }),
    init: flag({ type: boolean, long: "init", short: "i", description: "Intialize a new Crystallizer project" })
  },
  handler: ({ rootDirectory, init }) => {
    rootDirectory ??= process.cwd();
    if (init)
      initializeProject(rootDirectory);
    else {
      const files = new FileRunner(rootDirectory);
      files.runAll();
    }
  }
});

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