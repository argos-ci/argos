/**
 * Curated stand-in for Shiki's `shiki` entry point, aliased over the real one in
 * `vite.config.mts`.
 *
 * `@pierre/diffs` imports `bundledLanguages` from `shiki`, which is the *full*
 * bundle: a map of 243 grammars and 66 themes, each behind its own dynamic
 * import. Rolldown faithfully emits one chunk per entry, so the build shipped
 * 309 chunks / 10.3 MB of syntax highlighting for an app that can only ever ask
 * for the handful of languages in {@link BUNDLED_LANGUAGES}.
 *
 * This module mirrors the shape of `shiki/dist/index.mjs` — `export * from
 * "@shikijs/core"` plus the bundle-bound helpers — but with the grammar map cut
 * down to what the diff viewer can actually request, and the theme map emptied
 * (themes come from `@pierre/theming`, never from Shiki's bundle).
 *
 * Core and engines are pulled through `shiki`'s own subpaths rather than
 * `@shikijs/*` directly, so we share one instance with `@pierre/diffs` and stay
 * on whatever version it resolves.
 */
// `codeToHast` and `getLastGrammarState` infer types that name hast's `Root`.
// Importing it here is what lets TypeScript write those inferred types down
// without pointing into pnpm's private store (TS2883). There is no `hast`
// package on npm — the types ship as `@types/hast` — so knip.json lists this
// specifier under `ignoreDependencies`.
import type {} from "hast";
import {
  createBundledHighlighter,
  createSingletonShorthands,
  guessEmbeddedLanguages,
} from "shiki/core";
import { createJavaScriptRegexEngine } from "shiki/engine/javascript";

export * from "shiki/core";
export {
  createJavaScriptRegexEngine,
  defaultJavaScriptRegexConstructor,
} from "shiki/engine/javascript";
export { createOnigurumaEngine, loadWasm } from "shiki/engine/oniguruma";

/**
 * The grammars the app can reach, and the only ones worth shipping.
 *
 * This is the source of truth for `getLanguageFromContentType`, whose return
 * type is derived from these keys — a new `case` there is a type error until the
 * matching grammar is added here. Grammar modules are self-contained (they
 * inline the languages they embed), so adding one costs exactly one chunk.
 */
export const bundledLanguages = {
  css: () => import("@shikijs/langs/css"),
  html: () => import("@shikijs/langs/html"),
  javascript: () => import("@shikijs/langs/javascript"),
  json: () => import("@shikijs/langs/json"),
  markdown: () => import("@shikijs/langs/markdown"),
  xml: () => import("@shikijs/langs/xml"),
  yaml: () => import("@shikijs/langs/yaml"),
};

/**
 * Languages the diff viewer accepts: the bundled grammars plus `text`, which
 * Shiki treats as a special language and resolves without a grammar.
 */
export type BundledLanguage = keyof typeof bundledLanguages | "text";

/**
 * Empty on purpose. `@pierre/diffs` resolves themes through its own registry,
 * seeded from `@pierre/theming`, and creates the highlighter with `themes: []`.
 * Shiki's own theme map is never read, so bundling it only cost chunks.
 */
export const bundledThemes = {};

export const createHighlighter = createBundledHighlighter({
  langs: bundledLanguages,
  themes: bundledThemes,
  // The real entry defaults to the Oniguruma engine, which drags in the WASM
  // binary. `@pierre/diffs` always passes its own engine, so this default is
  // dead — but naming the JS engine keeps the WASM out of the graph entirely.
  engine: () => createJavaScriptRegexEngine(),
});

export const {
  codeToHtml,
  codeToHast,
  codeToTokens,
  codeToTokensBase,
  codeToTokensWithThemes,
  getSingletonHighlighter,
  getLastGrammarState,
} = createSingletonShorthands(createHighlighter, { guessEmbeddedLanguages });
