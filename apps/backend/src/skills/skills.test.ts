import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";
import type { Transport } from "@modelcontextprotocol/sdk/shared/transport.js";
import express from "express";
import request from "supertest";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { createMcpServer } from "../mcp/server";
import { buildDiscoveryIndex, getSkills, resetSkillsCache } from "./registry";
import { installSkillsRoutes } from "./router";

const TREE = {
  tree: [
    { path: "README.md", type: "blob" }, // outside skills/ — ignored
    { path: "skills/argos-cli/SKILL.md", type: "blob" },
    { path: "skills/argos-cli/agents/openai.yaml", type: "blob" },
    { path: "skills/argos-pr-review", type: "tree" }, // dir entry — ignored
    { path: "skills/argos-pr-review/SKILL.md", type: "blob" },
    { path: "skills/argos-pr-review/references/flaky-fixes.md", type: "blob" },
    { path: "skills/argos-pr-review/references/baseline.md", type: "blob" },
    { path: "skills/no-skill-md/notes.txt", type: "blob" }, // no SKILL.md — dropped
  ],
};

const SKILL_MD: Record<string, string> = {
  "argos-cli":
    "---\nname: argos-cli\ndescription: Operate Argos from the CLI.\n---\n# Argos CLI",
  "argos-pr-review":
    "---\nname: argos-pr-review\ndescription: >\n  Review Argos visual\n  regression builds.\n---\n# Argos PR Review",
};

function mockResponse(
  body: unknown,
  { ok = true, status = 200 } = {},
): Response {
  return {
    ok,
    status,
    json: async () => body,
    text: async () => (typeof body === "string" ? body : JSON.stringify(body)),
  } as Response;
}

function stubFetch(impl: (url: string) => Response) {
  const fn = vi.fn(async (url: unknown) => impl(String(url)));
  vi.stubGlobal("fetch", fn);
  return fn;
}

const happyFetch = (url: string): Response => {
  if (url.startsWith("https://api.github.com/")) {
    return mockResponse(TREE);
  }
  const match = /\/skills\/([^/]+)\/SKILL\.md$/.exec(url);
  if (match && SKILL_MD[match[1]!]) {
    return mockResponse(SKILL_MD[match[1]!]);
  }
  return mockResponse("", { ok: false, status: 404 });
};

beforeEach(() => {
  resetSkillsCache();
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("getSkills", () => {
  it("enumerates the repo, parses frontmatter, and orders files", async () => {
    stubFetch(happyFetch);
    const skills = await getSkills();
    expect(skills).toEqual([
      {
        name: "argos-cli",
        description: "Operate Argos from the CLI.",
        files: ["SKILL.md", "agents/openai.yaml"],
      },
      {
        name: "argos-pr-review",
        // A folded (`>`) YAML scalar is joined and trimmed.
        description: "Review Argos visual regression builds.",
        files: [
          "SKILL.md",
          "references/baseline.md",
          "references/flaky-fixes.md",
        ],
      },
    ]);
  });

  it("caches so the tree is fetched once", async () => {
    const fetchMock = stubFetch(happyFetch);
    await getSkills();
    await getSkills();
    const treeCalls = fetchMock.mock.calls.filter((c) =>
      String(c[0]).startsWith("https://api.github.com/"),
    );
    expect(treeCalls).toHaveLength(1);
  });

  it("serves the last good value when a refresh fails (stale-while-error)", async () => {
    vi.useFakeTimers();
    try {
      stubFetch(happyFetch);
      const first = await getSkills();
      expect(first).toHaveLength(2);

      // Past the TTL, GitHub is down — the cached value is still returned.
      vi.advanceTimersByTime(31 * 60 * 1000);
      stubFetch(() => mockResponse("", { ok: false, status: 503 }));
      expect(await getSkills()).toEqual(first);
    } finally {
      vi.useRealTimers();
    }
  });
});

describe("buildDiscoveryIndex", () => {
  it("produces the legacy digest-free index shape", () => {
    const index = buildDiscoveryIndex([
      { name: "argos-cli", description: "d", files: ["SKILL.md"] },
    ]);
    expect(index).toEqual({
      skills: [{ name: "argos-cli", description: "d", files: ["SKILL.md"] }],
    });
  });
});

describe("well-known routes", () => {
  const app = express();
  const router = express.Router();
  installSkillsRoutes(router);
  app.use(router);

  beforeEach(() => {
    stubFetch(happyFetch);
  });

  it("serves the discovery index at both prefixes", async () => {
    for (const prefix of ["/.well-known/agent-skills", "/.well-known/skills"]) {
      const res = await request(app).get(`${prefix}/index.json`);
      expect(res.status).toBe(200);
      expect(res.body.skills.map((s: { name: string }) => s.name)).toEqual([
        "argos-cli",
        "argos-pr-review",
      ]);
    }
  });

  it("redirects a declared skill file to the repo raw URL", async () => {
    const res = await request(app).get(
      "/.well-known/agent-skills/argos-pr-review/references/baseline.md",
    );
    expect(res.status).toBe(302);
    expect(res.headers["location"]).toBe(
      "https://raw.githubusercontent.com/argos-ci/argos-javascript/main/skills/argos-pr-review/references/baseline.md",
    );
  });

  it("404s a file the skill does not declare (allowlist, no open redirect)", async () => {
    const res = await request(app).get(
      "/.well-known/agent-skills/argos-cli/references/secret.md",
    );
    expect(res.status).toBe(404);
  });

  it("404s an unknown skill", async () => {
    const res = await request(app).get(
      "/.well-known/agent-skills/nope/SKILL.md",
    );
    expect(res.status).toBe(404);
  });
});

describe("MCP resources", () => {
  it("lists the skills as resources and reads their SKILL.md", async () => {
    const fetchMock = stubFetch(happyFetch);
    const server = createMcpServer({ authorization: "Bearer test" });
    const [clientTransport, serverTransport] =
      InMemoryTransport.createLinkedPair();
    const client = new Client({ name: "test", version: "0" });
    await Promise.all([
      server.connect(serverTransport as unknown as Transport),
      client.connect(clientTransport as unknown as Transport),
    ]);

    try {
      // Server creation is lazy: the skills repo is only contacted once a
      // client actually asks for resources.
      expect(fetchMock).not.toHaveBeenCalled();

      const { resources } = await client.listResources();
      const byName = new Map(resources.map((r) => [r.name, r]));
      expect([...byName.keys()]).toEqual(
        expect.arrayContaining(["argos-cli", "argos-pr-review"]),
      );

      const prReview = byName.get("argos-pr-review");
      // URI is the canonical app well-known location (origin varies by env).
      expect(prReview?.uri).toMatch(
        /\/\.well-known\/agent-skills\/argos-pr-review\/SKILL\.md$/,
      );

      const read = await client.readResource({ uri: prReview!.uri });
      const content = read.contents[0];
      const text = content && "text" in content ? content.text : "";
      expect(String(text)).toContain("# Argos PR Review");
    } finally {
      await client.close();
      await server.close();
    }
  });
});
