import type { Request } from "express";
import { describe, expect, it } from "vitest";

import type {
  AuthOAuthPayload,
  AuthPATPayload,
  AuthProjectPayload,
} from "@/auth/payload";

import { parseUserAgentAgentName, resolveRequestAgentId } from "./request";

/** A request carrying just the header the resolver reads. */
function req(userAgent?: string): Request {
  return {
    get: (name: string) =>
      name.toLowerCase() === "user-agent" ? userAgent : undefined,
  } as Request;
}

/** An OAuth payload with only the fields the resolver reads. */
function oauth(input: {
  clientId: string;
  knownAppId: string | null;
}): AuthOAuthPayload {
  return { type: "oauth", ...input } as AuthOAuthPayload;
}

const PAT = { type: "pat" } as AuthPATPayload;
const PROJECT = { type: "project" } as AuthProjectPayload;

describe("parseUserAgentAgentName", () => {
  it.each([
    ["argos-cli/6.7.0 node/22.11.0 agent/claude", "claude"],
    ["argos-cli/6.7.0 agent/custom-agent@2.0", "custom-agent@2.0"],
    ["agent/devin", "devin"],
    ["argos-cli/6.7.0 agent/cursor some-proxy/1.0", "cursor"],
  ])("reads the agent token of %j", (userAgent, expected) => {
    expect(parseUserAgentAgentName(userAgent)).toBe(expected);
  });

  it.each([
    ["no header", undefined],
    ["no agent token", "argos-cli/6.7.0 node/22.11.0"],
    ["a token that only looks like one", "myagent/claude"],
    ["an empty agent token", "argos-cli/6.7.0 agent/"],
    ["a name outside the token grammar", "argos-cli/6.7.0 agent/(claude)"],
  ])("returns null for %s", (_label, userAgent) => {
    expect(parseUserAgentAgentName(userAgent)).toBeNull();
  });
});

describe("resolveRequestAgentId", () => {
  it("resolves the name the CLI reports to a registry id", () => {
    expect(
      resolveRequestAgentId(req("argos-cli/6.7.0 agent/claude"), PAT),
    ).toBe("claude-code");
    expect(resolveRequestAgentId(req("argos-cli/6.7.0 agent/codex"), PAT)).toBe(
      "openai-codex",
    );
  });

  it("keeps an unrecognized agent as an agent", () => {
    expect(
      resolveRequestAgentId(req("argos-cli/6.7.0 agent/homemade"), PAT),
    ).toBe("unknown");
  });

  it("prefers the reported agent over the OAuth client", () => {
    expect(
      resolveRequestAgentId(
        req("argos-cli/6.7.0 agent/cursor"),
        oauth({ clientId: "argos-cli", knownAppId: "argos-cli" }),
      ),
    ).toBe("cursor");
  });

  it("resolves a well-known MCP client from its OAuth registration", () => {
    expect(
      resolveRequestAgentId(
        req("node"),
        oauth({ clientId: "oc_abc", knownAppId: "claude-code" }),
      ),
    ).toBe("claude-code");
  });

  it("treats an unrecognized OAuth client as an agent", () => {
    expect(
      resolveRequestAgentId(
        req("node"),
        oauth({ clientId: "oc_abc", knownAppId: null }),
      ),
    ).toBe("unknown");
  });

  it("does not take the CLI itself for an agent", () => {
    expect(
      resolveRequestAgentId(
        req("argos-cli/6.7.0 node/22.11.0"),
        oauth({ clientId: "argos-cli", knownAppId: "argos-cli" }),
      ),
    ).toBeNull();
  });

  it.each([
    ["a personal access token", PAT],
    ["a project token", PROJECT],
    ["no authentication", null],
  ])("resolves no agent for %s without an agent token", (_label, auth) => {
    expect(resolveRequestAgentId(req("Mozilla/5.0"), auth)).toBeNull();
  });
});
