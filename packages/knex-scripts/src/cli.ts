import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { fileURLToPath, URL } from "node:url";
import { program } from "commander";

import { addCheckStructureCommand } from "./check-structure.js";
import { addCreateCommand } from "./create.js";
import { addDropCommand } from "./drop.js";
import { addDumpCommand } from "./dump.js";
import { addLoadCommand } from "./load.js";
import { addTruncateCommand } from "./truncate.js";

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
