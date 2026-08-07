import { existsSync } from "node:fs";
import path from "node:path";

/**
 * Locates a directory by walking up from `from` until `marker` is found.
 */
function findUp(from: string, marker: string): string | null {
  let directory = from;

  for (;;) {
    if (existsSync(path.join(directory, marker))) {
      return directory;
    }
    const parent = path.dirname(directory);
    if (parent === directory) {
      return null;
    }
    directory = parent;
  }
}

/**
 * Root of this package, and of the repository containing it.
 *
 * Both are found by walking up from this module rather than by counting `../`
 * segments from it. That distinction is what lets the code be bundled: a bundler
 * emits modules at whatever depth it likes — `src/config/index.ts` can end up as
 * `dist/config/index.js` or inlined into `dist/chunks/config-a1b2c3.js` — and a
 * hard-coded `../../..` silently resolves somewhere else. Walking up is stable
 * as long as the emitted file is somewhere inside the package, which it is.
 */
function requireUp(from: string, marker: string): string {
  const found = findUp(from, marker);
  if (!found) {
    throw new Error(`no ${marker} found above ${from}`);
  }
  return found;
}

const packageRoot = requireUp(import.meta.dirname, "package.json");
const repositoryRoot = findUp(packageRoot, "pnpm-workspace.yaml");

/** Resolves a path against this package's root. */
export function resolveFromPackageRoot(...segments: string[]): string {
  return path.join(packageRoot, ...segments);
}

/**
 * Resolves a path against the repository root, or null when running outside a
 * checkout — a deployment that ships only the built output, for instance.
 */
export function resolveFromRepositoryRoot(
  ...segments: string[]
): string | null {
  return repositoryRoot ? path.join(repositoryRoot, ...segments) : null;
}
