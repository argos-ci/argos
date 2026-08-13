import { describe, expect, it } from "vitest";

import {
  getAgent,
  getAgentName,
  isAgentId,
  isPromptAgentId,
  PROMPT_AGENTS,
  resolveOAuthAgent,
  resolveReportedAgentId,
  UNKNOWN_AGENT_ID,
} from "./registry";

describe("resolveReportedAgentId", () => {
  it.each([
    // Ids resolve to themselves.
    ["claude-code", "claude-code"],
    ["cursor", "cursor"],
    // The slugs `@vercel/detect-agent` returns, which are shorter than our ids.
    // `claude` means Claude *Code* here: the CLI only ever runs under it.
    ["claude", "claude-code"],
    ["cowork", "claude-code"],
    ["codex", "openai-codex"],
    ["cursor-cli", "cursor"],
    ["gemini", "gemini-cli"],
    ["github-copilot-cli", "github-copilot"],
    // Versioned names: `_` is what Claude Code actually puts in `AI_AGENT`,
    // `@` is what the convention documents.
    ["claude-code_2-1-227_agent", "claude-code"],
    ["devin@1", "devin"],
    // Case and padding come from an environment variable, not from us.
    ["  Claude-Code  ", "claude-code"],
  ])("resolves %j to %j", (reported, expected) => {
    expect(resolveReportedAgentId(reported)).toBe(expected);
  });

  it.each([
    ["a name nobody registered", "homemade"],
    ["an empty name", ""],
    // The CLI is a tool a person drives — an agent driving it says so itself,
    // so the CLI reporting itself as the agent is not an agent.
    ["the Argos CLI", "argos-cli"],
  ])("resolves %s to the unknown agent", (_label, reported) => {
    expect(resolveReportedAgentId(reported)).toBe(UNKNOWN_AGENT_ID);
  });
});

describe("resolveOAuthAgent", () => {
  it("matches a first-party client id", () => {
    expect(resolveOAuthAgent({ clientId: "argos-cli" })?.id).toBe("argos-cli");
  });

  it("matches a client_uri host", () => {
    expect(resolveOAuthAgent({ clientUri: "https://claude.ai/app" })?.id).toBe(
      "claude",
    );
  });

  it("matches a redirect host", () => {
    expect(
      resolveOAuthAgent({ redirectUris: ["https://cursor.com/callback"] })?.id,
    ).toBe("cursor");
  });

  it("matches a software id", () => {
    expect(resolveOAuthAgent({ softwareId: "claude-code" })?.id).toBe(
      "claude-code",
    );
  });

  it.each([
    ["an unrecognized host", { clientUri: "https://evil.example" }],
    ["no metadata at all", {}],
    ["a malformed client_uri", { clientUri: "not a url" }],
    // Recognizable only by a name it chose for itself.
    ["a self-asserted name", { clientId: "oc_abc", softwareId: "cursor-ish" }],
  ])("does not match %s", (_label, metadata) => {
    expect(resolveOAuthAgent(metadata)).toBeNull();
  });

  it("never matches an agent that registers no OAuth signals", () => {
    // `devin` is in the registry but only ever reaches Argos through the CLI,
    // so nothing about a client's metadata may resolve to it.
    expect(resolveOAuthAgent({ softwareId: "devin" })).toBeNull();
    expect(resolveOAuthAgent({ clientUri: "https://devin.ai" })).toBeNull();
  });
});

describe("isAgentId", () => {
  it("is true for an agent", () => {
    expect(isAgentId("claude-code")).toBe(true);
  });

  it.each([
    ["the first-party CLI", "argos-cli"],
    ["the unknown agent", UNKNOWN_AGENT_ID],
    ["an id outside the registry", "nope"],
    ["nothing", null],
  ])("is false for %s", (_label, id) => {
    expect(isAgentId(id)).toBe(false);
  });
});

describe("getAgent / getAgentName", () => {
  it("reads an entry by id", () => {
    expect(getAgent("claude-code")?.name).toBe("Claude Code");
    expect(getAgentName("argos-cli")).toBe("Argos CLI");
  });

  it.each([
    ["an id outside the registry", "nope"],
    ["the unknown agent", UNKNOWN_AGENT_ID],
    ["nothing", null],
  ])("has no name for %s", (_label, id) => {
    expect(getAgentName(id)).toBeNull();
  });
});

describe("PROMPT_AGENTS", () => {
  it("offers the agents Argos can open, in order", () => {
    expect(PROMPT_AGENTS.map((agent) => agent.id)).toEqual([
      "claude",
      "openai-codex",
      "cursor",
    ]);
  });

  it("builds a deep link that carries the prompt without sending it", () => {
    const [claude] = PROMPT_AGENTS;
    expect(claude!.getPromptUrl("fix the header & footer")).toBe(
      "claude://code/new?q=fix%20the%20header%20%26%20footer",
    );
  });

  it("recognizes its own ids and nothing else", () => {
    expect(isPromptAgentId("cursor")).toBe(true);
    // In the registry, but no deep link to open it with.
    expect(isPromptAgentId("devin")).toBe(false);
    expect(isPromptAgentId("copy")).toBe(false);
  });
});
