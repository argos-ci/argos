/**
 * Stands in for `shiki/wasm`, aliased over the real one in `vite.config.mts`.
 *
 * `@pierre/diffs` picks its regex engine at runtime:
 *
 *     preferredHighlighter === "shiki-wasm"
 *       ? createOnigurumaEngine(import("shiki/wasm"))
 *       : createJavaScriptRegexEngine()
 *
 * The app pins `preferredHighlighter: "shiki-js"` (see `DiffEditor`'s
 * `BASE_OPTIONS`) to avoid relaxing the CSP for WebAssembly, so that branch is
 * unreachable — yet the static `import()` still emitted a 622 kB chunk holding
 * the base64-inlined Oniguruma binary.
 *
 * The default export keeps the module's shape (a WASM loader) and throws if the
 * dead branch ever comes back to life, which beats shipping the binary for a
 * code path the CSP would block anyway.
 */
export default function loadUnavailableOnigurumaWasm(): never {
  throw new Error(
    'Shiki\'s Oniguruma WASM engine is not bundled. The diff viewer runs on the JS engine ("shiki-js") so the app does not need `wasm-unsafe-eval` in its CSP; to use it, drop the `shiki/wasm` alias in vite.config.mts and widen the CSP.',
  );
}
