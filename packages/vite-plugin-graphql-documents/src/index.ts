import { readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import type { Plugin } from "vite";

import {
  buildDocumentIndex,
  inlineDocuments,
  type DocumentIndex,
} from "./documents.js";

export type { DocumentIndex, GraphqlCall } from "./documents.js";
export {
  buildDocumentIndex,
  findGraphqlCalls,
  inlineDocuments,
  parseDocumentLiterals,
  parseDocumentsMap,
} from "./documents.js";

/**
 * Replaces `graphql(`…`)` calls with the parsed document the generated code
 * would have looked up at runtime.
 *
 * GraphQL Codegen's client preset resolves documents through a map keyed by
 * query string (`src/gql/gql.ts`). That map names every operation in the app,
 * so importing it from anywhere retains all of them — the generated file says
 * as much in its own header:
 *
 * > 1. It is not tree-shakeable, so it will include all operations in the
 * >    project.
 *
 * In Argos that was a ~940 kB chunk, eagerly loaded on every page, holding the
 * document AST of all ~180 operations: opening `/login` parsed the build page's
 * queries.
 *
 * Codegen ships Babel and SWC plugins for this, but neither applies to a
 * `@vitejs/plugin-react` v6 setup on Vite 8, which transforms with Oxc. So this
 * does the equivalent rewrite as a Vite transform, inlining the AST at the call
 * site:
 *
 *   const Query = graphql(`query Auth_me { … }`)
 *   // becomes
 *   const Query = ({"kind":"Document","definitions":[…]})
 *
 * Inlining rather than importing the generated constant is what actually splits
 * the documents. `graphql.ts` is a single module, so as long as chunks import
 * their documents *from* it, Rolldown has to emit it as one shared chunk holding
 * every document any chunk needs — which is how the blob stays on the critical
 * path even once the map is out of the graph. Inlined, each document lands in
 * the one chunk that uses it, and the generated constants become unused exports
 * that tree-shake away, leaving `graphql.ts` to carry only its enums.
 *
 * Each document's source string occurs exactly once in a codebase (that is how
 * codegen keys the map), so this duplicates nothing.
 *
 * A literal missing from the index is left untouched: the runtime lookup still
 * resolves it, at the cost of retaining the map. That only happens when codegen
 * output is stale, so it warns rather than fails.
 */
export function graphqlDocuments(options: {
  /** Directory holding the codegen client-preset output (`gql.ts`, `graphql.ts`). */
  generatedDir: string;
}): Plugin {
  const { generatedDir } = options;
  const mapPath = join(generatedDir, "gql.ts");
  const documentsPath = join(generatedDir, "graphql.ts");

  let cache: { key: string; index: DocumentIndex } | null = null;

  /**
   * Re-reads the generated files whenever they change, so `watch-codegen` edits
   * take effect without restarting the dev server.
   */
  function getIndex(): DocumentIndex {
    const key = `${statSync(mapPath).mtimeMs}:${statSync(documentsPath).mtimeMs}`;
    if (cache?.key === key) {
      return cache.index;
    }
    const index = buildDocumentIndex({
      map: readFileSync(mapPath, "utf8"),
      documents: readFileSync(documentsPath, "utf8"),
    });
    cache = { key, index };
    return index;
  }

  return {
    name: "argos:graphql-documents",
    // Run before the React/Oxc transform, while the source is still the
    // original TypeScript the codegen output was extracted from.
    enforce: "pre",
    transform(code, id) {
      if (!/\.[cm]?[jt]sx?$/.test(id) || id.includes("/node_modules/")) {
        return null;
      }
      // The generated files define the map and the documents themselves;
      // rewriting them would be circular.
      if (id.startsWith(generatedDir)) {
        return null;
      }
      if (!code.includes("graphql(`")) {
        return null;
      }

      const { magic, misses } = inlineDocuments(code, getIndex());

      if (misses.length > 0) {
        this.warn(
          `Unknown GraphQL document(s) left as a runtime lookup, which retains the whole document map. Re-run codegen.\n  ${misses.join("\n  ")}`,
        );
      }

      if (!magic) {
        return null;
      }

      return {
        code: magic.toString(),
        // Serialised rather than passed as an object: magic-string types `file`
        // as `string | undefined`, which will not satisfy Rolldown's
        // `string | null` under `exactOptionalPropertyTypes`.
        map: magic.generateMap({ hires: true, source: id }).toString(),
      };
    },
  };
}
