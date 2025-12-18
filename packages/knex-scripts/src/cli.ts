import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { fileURLToPath, URL } from "node:url";
import { program } from "commander";

import { addCheckStructureCommand } from "./check-structure";
import { addCreateCommand } from "./create";
import { addDropCommand } from "./drop";
import { addDumpCommand } from "./dump";
import { addLoadCommand } from "./load";
import { addTruncateCommand } from "./truncate";

const __dirname = fileURLToPath(new URL(".", import.meta.url));

const rawPkg = await readFile(resolve(__dirname, "..", "package.json"), "utf8");
const pkg = JSON.parse(rawPkg);

program
  .name(pkg.name)
  .version(pkg.version)
  .description("CLI tool to manage PostgresSQL database over Knex.js.");

addCheckStructureCommand(program);
addCreateCommand(program);
addDropCommand(program);
addDumpCommand(program);
addLoadCommand(program);
addTruncateCommand(program);

if (!process.argv.slice(2).length) {
  program.outputHelp();
} else {
  program.parse(process.argv);
}
