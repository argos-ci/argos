#!/usr/bin/env node
import { rm } from "node:fs/promises";
import path from "node:path";
import { parseArgs } from "node:util";
import { rolldown, watch as rolldownWatch } from "rolldown";

import {
  createBundleOptions,
  describeOutput,
  findUnresolvableImports,
  readPackageConfig,
  resolveEntries,
} from "./bundle.ts";

const USAGE = `Usage: argos-build [options]

Bundles a package's TypeScript entry points to ESM, reading the entry globs and
target from the "argos-build" block of its package.json.

Options:
  -d, --out-dir <dir>  Output directory (default: dist)
      --clean          Remove the output directory before building
      --watch          Rebuild on change and keep running
      --quiet          Only report problems
  -h, --help           Show this message
`;

const { values } = parseArgs({
  options: {
    "out-dir": { type: "string", short: "d", default: "dist" },
    clean: { type: "boolean", default: false },
    watch: { type: "boolean", default: false },
    quiet: { type: "boolean", default: false },
    help: { type: "boolean", short: "h", default: false },
  },
});

if (values.help) {
  process.stdout.write(USAGE);
  process.exit(0);
}

const cwd = process.cwd();
const outDir = path.resolve(cwd, values["out-dir"]);
const config = readPackageConfig(cwd);
const options = createBundleOptions({
  cwd,
  outDir,
  entries: await resolveEntries(cwd, config.entries),
  target: config.target,
  externalDependencies: config.externalDependencies,
});

function report(message: string): void {
  if (!values.quiet) {
    process.stdout.write(`${message}\n`);
  }
}

function reportError(message: string): void {
  process.stderr.write(`argos-build: ${message}\n`);
}

/**
 * Reports imports Node will not be able to resolve at runtime.
 *
 * Returns true when the output is sound. Chunk hashes change on every build, so
 * this always reads the directory as it now stands.
 */
async function verifyImports(): Promise<boolean> {
  const unresolvable = await findUnresolvableImports(cwd, outDir);
  if (unresolvable.length === 0) {
    return true;
  }
  reportError(
    `the output imports packages that cannot be resolved from ${path.basename(cwd)}/node_modules:\n` +
      unresolvable.map((name) => `  ${name}`).join("\n") +
      "\nThey come from a bundled workspace package — add them to this package's dependencies.",
  );
  return false;
}

// Chunk file names carry a content hash, so without this a long-lived output
// directory fills up with chunks nothing points at any more.
if (values.clean) {
  await rm(outDir, { recursive: true, force: true });
}

if (values.watch) {
  const watcher = rolldownWatch(options);

  watcher.on("event", (event) => {
    switch (event.code) {
      case "BUNDLE_END": {
        report(`Bundled in ${event.duration}ms`);
        void verifyImports();
        break;
      }
      case "ERROR": {
        reportError(event.error.message);
        break;
      }
      default:
        break;
    }
  });

  watcher.on("change", (id, change) => {
    report(`${change.event} ${path.relative(cwd, id)}`);
  });

  const close = async () => {
    await watcher.close();
    process.exit(0);
  };
  process.on("SIGINT", close);
  process.on("SIGTERM", close);
} else {
  const startedAt = performance.now();
  const bundle = await rolldown(options);
  let output;
  try {
    output = await bundle.write(options.output);
  } finally {
    await bundle.close();
  }

  if (!(await verifyImports())) {
    process.exit(1);
  }

  const duration = Math.round(performance.now() - startedAt);
  report(`Bundled ${describeOutput(output)} (${duration}ms)`);
}
