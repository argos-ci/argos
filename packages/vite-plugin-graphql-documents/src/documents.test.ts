import { describe, expect, it } from "vitest";

import {
  buildDocumentIndex,
  findGraphqlCalls,
  inlineDocuments,
  parseDocumentLiterals,
  parseDocumentsMap,
  summarizeDocument,
  type DocumentIndex,
} from "./documents.js";

/**
 * Shaped exactly like the codegen client-preset output: one entry per line, the
 * key a double-quoted JS string, the value a `types.` member.
 */
const GQL_MAP = `/* eslint-disable */
import * as types from './graphql';

type Documents = {
    "\\n  query Auth_me {\\n    me {\\n      id\\n    }\\n  }\\n": typeof types.Auth_meDocument,
};

const documents: Documents = {
    "\\n  query Auth_me {\\n    me {\\n      id\\n    }\\n  }\\n": types.Auth_meDocument,
    "\\n  fragment Avatar on Account {\\n    url\\n  }\\n": types.AvatarFragmentDoc,
};

export function graphql(source: string) {
  return (documents as any)[source] ?? {};
}
`;

const GQL_DOCUMENTS = `/* eslint-disable */
export type Foo = { a: string };
export const Auth_meDocument = {"kind":"Document","definitions":[{"kind":"Op","name":"Auth_me"}]} as unknown as DocumentNode<Auth_meQuery, Auth_meQueryVariables>;
export const AvatarFragmentDoc = {"kind":"Document","definitions":[{"kind":"Frag","name":"Avatar"}]} as unknown as DocumentNode<AvatarFragment, unknown>;
`;

const ME_SOURCE = "\n  query Auth_me {\n    me {\n      id\n    }\n  }\n";
const ME_LITERAL =
  '{"kind":"Document","definitions":[{"kind":"Op","name":"Auth_me"}]}';

function buildIndex(): DocumentIndex {
  return buildDocumentIndex({ map: GQL_MAP, documents: GQL_DOCUMENTS });
}

describe("parseDocumentsMap", () => {
  it("maps each operation source to its generated constant", () => {
    const map = parseDocumentsMap(GQL_MAP);
    expect(map.get(ME_SOURCE)).toBe("Auth_meDocument");
    expect(map.get("\n  fragment Avatar on Account {\n    url\n  }\n")).toBe(
      "AvatarFragmentDoc",
    );
  });

  it("ignores the type-level `Documents` block above the runtime map", () => {
    // Both blocks list the same key, so a parser that started at the top of the
    // file would read the `typeof types.X` entry instead of the value.
    expect(parseDocumentsMap(GQL_MAP).size).toBe(2);
  });

  it("throws when the runtime map is missing", () => {
    expect(() => parseDocumentsMap("export const nope = 1;")).toThrow(
      /changed shape/,
    );
  });

  it("throws when the map parses to nothing", () => {
    expect(() =>
      parseDocumentsMap("const documents: Documents = {\n};\n"),
    ).toThrow(/zero entries/);
  });
});

describe("parseDocumentLiterals", () => {
  it("extracts the AST literal for each document constant", () => {
    const literals = parseDocumentLiterals(GQL_DOCUMENTS);
    expect(literals.get("Auth_meDocument")).toBe(ME_LITERAL);
    expect(literals.size).toBe(2);
  });

  it("skips declarations that are not documents", () => {
    expect(parseDocumentLiterals(GQL_DOCUMENTS).has("Foo")).toBe(false);
  });
});

describe("buildDocumentIndex", () => {
  it("keys AST literals by operation source", () => {
    expect(buildIndex().get(ME_SOURCE)).toBe(ME_LITERAL);
  });

  it("omits entries whose constant has no literal", () => {
    const index = buildDocumentIndex({
      map: GQL_MAP,
      documents: "export type Foo = { a: string };\n",
    });
    expect(index.size).toBe(0);
  });
});

describe("findGraphqlCalls", () => {
  it("locates a call and captures its raw template contents", () => {
    const code = `const Q = graphql(\`${ME_SOURCE}\`);`;
    const [call] = findGraphqlCalls(code);
    expect(call?.source).toBe(ME_SOURCE);
    expect(code.slice(call!.start, call!.end)).toBe(
      `graphql(\`${ME_SOURCE}\`)`,
    );
  });

  it("finds every call in a module", () => {
    const code = [
      "const A = graphql(`query A { a }`);",
      "const B = graphql(`query B { b }`);",
    ].join("\n");
    expect(findGraphqlCalls(code).map((c) => c.source)).toEqual([
      "query A { a }",
      "query B { b }",
    ]);
  });

  it("tolerates whitespace between the paren and the template", () => {
    expect(findGraphqlCalls("graphql(\n  `query A { a }`\n)")).toHaveLength(1);
  });

  it("ignores similarly named identifiers and member calls", () => {
    expect(findGraphqlCalls("myGraphql(`query A { a }`)")).toEqual([]);
    expect(findGraphqlCalls("client.graphql(`query A { a }`)")).toEqual([]);
  });

  it("skips interpolated templates, which codegen cannot index", () => {
    expect(findGraphqlCalls("graphql(`query ${name} { a }`)")).toEqual([]);
  });

  it("skips calls with extra arguments", () => {
    expect(findGraphqlCalls("graphql(`query A { a }`, opts)")).toEqual([]);
  });

  it("keeps scanning after a call it had to skip", () => {
    const code = [
      "graphql(`query Skipped ${x} { a }`);",
      "graphql(`query Found { b }`);",
    ].join("\n");
    expect(findGraphqlCalls(code).map((c) => c.source)).toEqual([
      "query Found { b }",
    ]);
  });
});

describe("inlineDocuments", () => {
  it("replaces a known call with its AST literal", () => {
    const code = `const Query = graphql(\`${ME_SOURCE}\`);`;
    const { magic, misses } = inlineDocuments(code, buildIndex());
    expect(misses).toEqual([]);
    expect(magic?.toString()).toBe(`const Query = (${ME_LITERAL});`);
  });

  it("produces a sourcemap for the edit", () => {
    const code = `const Query = graphql(\`${ME_SOURCE}\`);`;
    const { magic } = inlineDocuments(code, buildIndex());
    const map = magic!.generateMap({ hires: true, source: "test.ts" });
    expect(map.sources).toEqual(["test.ts"]);
    expect(map.mappings.length).toBeGreaterThan(0);
  });

  it("reports unknown documents by name and leaves them intact", () => {
    const code = "const Query = graphql(`query Unindexed { a }`);";
    const { magic, misses } = inlineDocuments(code, buildIndex());
    expect(misses).toEqual(["Unindexed"]);
    // Nothing was rewritten, so the runtime lookup still resolves it.
    expect(magic).toBeNull();
  });

  it("rewrites known calls even when another one is unknown", () => {
    const code = [
      "const A = graphql(`query Unindexed { a }`);",
      `const B = graphql(\`${ME_SOURCE}\`);`,
    ].join("\n");
    const { magic, misses } = inlineDocuments(code, buildIndex());
    expect(misses).toEqual(["Unindexed"]);
    expect(magic?.toString()).toContain(`const B = (${ME_LITERAL});`);
    expect(magic?.toString()).toContain("graphql(`query Unindexed { a }`)");
  });

  it("returns no edit for a module with no calls", () => {
    const { magic, misses } = inlineDocuments(
      "export const a = 1;",
      buildIndex(),
    );
    expect(magic).toBeNull();
    expect(misses).toEqual([]);
  });

  it("keeps the literal a valid expression in a call argument", () => {
    const code = `useQuery(graphql(\`${ME_SOURCE}\`), {});`;
    const { magic } = inlineDocuments(code, buildIndex());
    expect(magic?.toString()).toBe(`useQuery((${ME_LITERAL}), {});`);
  });
});

describe("summarizeDocument", () => {
  it.each([
    ["query Foo { a }", "Foo"],
    ["mutation DoThing($i: I!) { x }", "DoThing"],
    ["subscription OnThing { x }", "OnThing"],
    ["fragment Bits on Account { id }", "Bits"],
  ])("names %s as %s", (source, expected) => {
    expect(summarizeDocument(source)).toBe(expected);
  });

  it("falls back to a snippet when there is no operation name", () => {
    expect(summarizeDocument("  { anonymous }  ")).toBe("{ anonymous }");
  });
});
