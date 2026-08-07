import { existsSync, readFileSync } from "node:fs";
import { glob, readdir, readFile } from "node:fs/promises";
import { builtinModules } from "node:module";
import path from "node:path";
import { parseSync } from "oxc-parser";
import type {
  OutputChunk,
  OutputOptions,
  RolldownOptions,
  RolldownOutput,
} from "rolldown";

const BUILTIN_MODULES = new Set(builtinModules);

/** The `argos-build` block a package declares in its `package.json`. */
export type PackageConfig = {
  /** Globs, relative to the package root, naming every entry point. */
  entries: string[];
  /** ECMAScript target for the transformer, e.g. `es2024`. */
  target: string;
  /**
   * Declared runtime dependencies that Node resolves at runtime — everything in
   * `dependencies`/`optionalDependencies` except the `workspace:` ones, which
   * are ours to inline.
   */
  externalDependencies: Set<string>;
};

export type BundleOptions = {
  /** Package root — where `package.json` and `tsconfig.json` live. */
  cwd: string;
  /** Absolute path of the output directory. */
  outDir: string;
  /** Absolute paths of the entry modules, already expanded from the globs. */
  entries: string[];
  /** ECMAScript target for the transformer, e.g. `es2024`. */
  target: string;
  /** Declared runtime dependencies to leave for Node to resolve. */
  externalDependencies: Set<string>;
};

/**
 * Expands the configured entry globs into absolute file paths.
 *
 * Rolldown takes explicit entry modules, and an unmatched pattern would
 * otherwise reach it as a literal path and fail with an unresolved-entry error
 * that names a glob.
 */
export async function resolveEntries(
  cwd: string,
  patterns: string[],
): Promise<string[]> {
  const entries = new Set<string>();
  for (const pattern of patterns) {
    let matched = false;
    for await (const match of glob(pattern, { cwd })) {
      matched = true;
      entries.add(path.resolve(cwd, match));
    }
    if (!matched) {
      throw new Error(
        `"argos-build.entries" pattern matched nothing: ${pattern}`,
      );
    }
  }
  return [...entries].sort();
}

/** Reads the `argos-build` block, failing loudly if it is missing or partial. */
export function readPackageConfig(cwd: string): PackageConfig {
  const manifestPath = path.join(cwd, "package.json");
  const manifest = JSON.parse(readFileSync(manifestPath, "utf8"));
  const config = manifest["argos-build"];
  if (!config) {
    throw new Error(`${manifestPath} has no "argos-build" block`);
  }
  if (!Array.isArray(config.entries) || config.entries.length === 0) {
    throw new Error(
      `${manifestPath}: "argos-build.entries" must be a glob list`,
    );
  }
  if (typeof config.target !== "string") {
    throw new Error(`${manifestPath}: "argos-build.target" is required`);
  }
  const declared: Record<string, string> = {
    ...manifest.dependencies,
    ...manifest.optionalDependencies,
  };
  return {
    entries: config.entries,
    target: config.target,
    // A `workspace:` dependency is source we own, so it belongs in the output
    // even though it is declared. Keying off the protocol rather than the
    // `@argos/` name prefix keeps the two from drifting apart.
    externalDependencies: new Set(
      Object.entries(declared)
        .filter(([, spec]) => !spec.startsWith("workspace:"))
        .map(([name]) => name),
    ),
  };
}

/** Reads `source` as a plain string literal, or null when it is anything else. */
function readStringLiteral(source: string): string | null {
  const quote = source[0];
  if (
    source.length < 2 ||
    (quote !== '"' && quote !== "'" && quote !== "`") ||
    source.at(-1) !== quote
  ) {
    return null;
  }
  const value = source.slice(1, -1);
  return value.includes("\\") || value.includes("${") ? null : value;
}

/** The package name a specifier belongs to, e.g. `@scope/pkg/sub` → `@scope/pkg`. */
function packageNameOf(specifier: string): string {
  const segments = specifier.split("/");
  return specifier.startsWith("@")
    ? segments.slice(0, 2).join("/")
    : (segments[0] ?? specifier);
}

/**
 * Builds the rolldown options for one package.
 *
 * What stays external is exactly what the package declares as a runtime
 * dependency. Everything else goes in the output:
 *
 * - **Declared dependencies stay external.** They are what Node has to be able
 *   to load: `sharp` and `@argos-ci/mask-fingerprint` ship `.node` bindings and
 *   `odiff-bin` spawns a platform executable, none of which can be bundled. And
 *   Sentry's instrumentation patches `express`, `pg` and `http` as they load —
 *   inlining them would leave it nothing to hook.
 * - **Workspace packages are inlined**, straight from their TypeScript, which is
 *   why they need no build of their own.
 * - **Anything else is inlined too.** A dependency of a bundled workspace
 *   package is not resolvable from this package's `node_modules` under pnpm, so
 *   leaving it external would fail at runtime. Baking it in keeps the dependency
 *   the workspace package's own business instead of something every consumer has
 *   to redeclare.
 */
export function createBundleOptions(
  options: BundleOptions,
): RolldownOptions & { output: OutputOptions } {
  const { cwd, outDir, entries, target, externalDependencies } = options;

  return {
    cwd,
    input: entries,
    platform: "node",
    resolve: { tsconfigFilename: path.join(cwd, "tsconfig.json") },
    external: (id) => {
      if (id.startsWith(".") || id.startsWith("@/") || path.isAbsolute(id)) {
        return false;
      }
      const name = packageNameOf(id);
      if (id.startsWith("node:") || BUILTIN_MODULES.has(name)) {
        return true;
      }
      return externalDependencies.has(name);
    },
    transform: { target },
    output: {
      dir: outDir,
      format: "esm",
      // Entries keep the path they had under `src`, so the files production and
      // knexfile.js point at do not move.
      entryFileNames: (chunk) => {
        const facade = chunk.facadeModuleId ?? "";
        const relative = path.relative(path.join(cwd, "src"), facade);
        return `${relative.replace(/\.[cm]?tsx?$/, "")}.js`;
      },
      chunkFileNames: "chunks/[name]-[hash].js",
      sourcemap: false,
      minify: false,
    },
  };
}

/**
 * Checks that every package the emitted files still import can be resolved from
 * the app's own `node_modules`.
 *
 * Bundling a workspace package from source turns *its* dependencies into
 * imports of the app, and pnpm does not install those for the app. Left
 * unchecked this only surfaces when the built process is started.
 *
 * Reads the output directory rather than the build result, so the same check
 * covers watch rebuilds — which report no chunk metadata.
 */
export async function findUnresolvableImports(
  cwd: string,
  outDir: string,
): Promise<string[]> {
  const entries = await readdir(outDir, {
    recursive: true,
    withFileTypes: true,
  });

  const imported = new Set<string>();
  for (const entry of entries) {
    if (!entry.isFile() || !entry.name.endsWith(".js")) {
      continue;
    }
    const file = path.join(entry.parentPath, entry.name);
    const code = await readFile(file, "utf8");
    const { module: record } = parseSync(file, code, { lang: "js" });
    const specifiers = [
      ...record.staticImports.map((entry) => entry.moduleRequest.value),
      ...record.staticExports.flatMap((entry) =>
        entry.entries
          .map((exportEntry) => exportEntry.moduleRequest?.value)
          .filter((value) => value !== undefined),
      ),
      // A dynamic import carries only a span, and it can hold any expression —
      // `import(knexFile)` is a variable, not a package to look for.
      ...record.dynamicImports
        .map((entry) =>
          readStringLiteral(
            code.slice(entry.moduleRequest.start, entry.moduleRequest.end),
          ),
        )
        .filter((value) => value !== null),
    ];
    for (const value of specifiers) {
      if (
        !value ||
        value.startsWith(".") ||
        value.startsWith("/") ||
        value.startsWith("node:")
      ) {
        continue;
      }
      imported.add(packageNameOf(value));
    }
  }

  return [...imported]
    .filter(
      (name) =>
        !existsSync(path.join(cwd, "node_modules", name, "package.json")),
    )
    .sort();
}

/** Formats the output listing shown after a build. */
export function describeOutput(output: RolldownOutput): string {
  const chunks = output.output.filter(
    (chunk): chunk is OutputChunk => chunk.type === "chunk",
  );
  const entries = chunks.filter((chunk) => chunk.isEntry);
  const bytes = chunks.reduce((total, chunk) => total + chunk.code.length, 0);
  return `${entries.length} entries, ${chunks.length - entries.length} shared chunks, ${Math.round(bytes / 1024)} kB`;
}
