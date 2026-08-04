import MagicString from "magic-string";

/** Operation source string -> the document AST literal that parses it. */
export type DocumentIndex = Map<string, string>;

/**
 * Joins the two generated files into the lookup the transform needs: `gql.ts`
 * knows which constant serves a given source string, `graphql.ts` holds that
 * constant's AST.
 */
export function buildDocumentIndex(sources: {
  map: string;
  documents: string;
}): DocumentIndex {
  const constNames = parseDocumentsMap(sources.map);
  const literals = parseDocumentLiterals(sources.documents);
  const index: DocumentIndex = new Map();
  for (const [source, constName] of constNames) {
    const literal = literals.get(constName);
    if (literal) {
      index.set(source, literal);
    }
  }
  return index;
}

/**
 * Extracts the `"<source>": types.<Const>` entries of the generated runtime
 * map. Codegen emits one entry per line, with the key as a JSON-compatible
 * double-quoted string.
 */
export function parseDocumentsMap(source: string): Map<string, string> {
  const start = source.indexOf("const documents: Documents = {");
  if (start === -1) {
    throw new Error(
      "Could not find the generated `documents` map in gql.ts. The codegen client-preset output changed shape.",
    );
  }
  const entries = new Map<string, string>();
  const entry = /^\s*("(?:[^"\\]|\\.)*"):\s*types\.(\w+),?$/gm;
  entry.lastIndex = start;
  let match: RegExpExecArray | null;
  while ((match = entry.exec(source)) !== null) {
    entries.set(JSON.parse(match[1]!) as string, match[2]!);
  }
  if (entries.size === 0) {
    throw new Error(
      "The generated `documents` map parsed to zero entries. The codegen client-preset output changed shape.",
    );
  }
  return entries;
}

/**
 * Extracts each `export const <Const> = {…} as unknown as DocumentNode<…>` AST
 * literal from the generated documents module.
 */
export function parseDocumentLiterals(source: string): Map<string, string> {
  const literals = new Map<string, string>();
  const declaration =
    /^export const (\w+) = (\{.*\}) as unknown as DocumentNode</gm;
  let match: RegExpExecArray | null;
  while ((match = declaration.exec(source)) !== null) {
    literals.set(match[1]!, match[2]!);
  }
  return literals;
}

export type GraphqlCall = {
  /** Offset of the `graphql` identifier. */
  start: number;
  /** Offset just past the call's `)`. */
  end: number;
  /** Raw template contents, matching the generated map's keys byte for byte. */
  source: string;
};

/**
 * Finds `graphql(`…`)` calls. Interpolated templates are skipped: their runtime
 * value is not knowable here, and codegen cannot have indexed them either.
 */
export function findGraphqlCalls(code: string): GraphqlCall[] {
  const calls: GraphqlCall[] = [];
  // Reject a leading word character, `$` or `.` so `myGraphql(`…`)` and
  // `foo.graphql(`…`)` are not mistaken for the codegen helper.
  const opening = /(^|[^\w$.])graphql\(\s*`/g;
  let match: RegExpExecArray | null;

  while ((match = opening.exec(code)) !== null) {
    const start = match.index + match[1]!.length;
    const contentStart = match.index + match[0].length;
    let index = contentStart;
    let closing = -1;
    while (index < code.length) {
      const char = code[index];
      if (char === "\\") {
        index += 2;
        continue;
      }
      if (char === "`") {
        closing = index;
        break;
      }
      if (char === "$" && code[index + 1] === "{") {
        break;
      }
      index += 1;
    }
    if (closing === -1) {
      // Unterminated, or interpolated: leave it to the runtime lookup.
      opening.lastIndex = contentStart;
      continue;
    }
    // Only a plain `)` may follow; anything else (`, options)`) is a shape we
    // did not anticipate, so leave it alone.
    const after = /^\s*\)/.exec(code.slice(closing + 1));
    if (!after) {
      opening.lastIndex = closing + 1;
      continue;
    }
    calls.push({
      start,
      end: closing + 1 + after[0].length,
      source: code.slice(contentStart, closing),
    });
    opening.lastIndex = closing + 1;
  }

  return calls;
}

/**
 * Rewrites every indexed `graphql(`…`)` call in a module. Returns the pending
 * edit, or `magic: null` when there was nothing to rewrite.
 */
export function inlineDocuments(
  code: string,
  index: DocumentIndex,
): { magic: MagicString | null; misses: string[] } {
  const magic = new MagicString(code);
  const misses: string[] = [];
  let rewrote = false;

  for (const call of findGraphqlCalls(code)) {
    const literal = index.get(call.source);
    if (!literal) {
      misses.push(summarizeDocument(call.source));
      continue;
    }
    // Parenthesised so the literal is unambiguously an expression wherever the
    // call sat.
    magic.overwrite(call.start, call.end, `(${literal})`);
    rewrote = true;
  }

  return { magic: rewrote ? magic : null, misses };
}

/** Names a document for a warning, falling back to a snippet of its source. */
export function summarizeDocument(source: string): string {
  const name = /\b(?:query|mutation|subscription|fragment)\s+(\w+)/.exec(
    source,
  );
  return name ? name[1]! : source.trim().slice(0, 60);
}
