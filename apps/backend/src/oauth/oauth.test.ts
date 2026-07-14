import { describe, expect, it } from "vitest";

import {
  generateClientId,
  redirectUriMatches,
  resolveClientVerification,
} from "./clients";
import { resolveKnownApp } from "./known-apps";
import {
  getAuthorizationServerMetadata,
  getProtectedResourceMetadata,
} from "./metadata";
import {
  isOAuthScope,
  OAUTH_SCOPE_LIST,
  parseScopeString,
  parseScopeStringStrict,
  serializeScopes,
  UnknownScopeError,
} from "./scopes";

describe("scopes", () => {
  it("parses and de-duplicates known scopes in canonical order", () => {
    expect(parseScopeString("projects:read profile profile")).toEqual([
      "profile",
      "projects:read",
    ]);
  });

  it("drops unknown scopes when parsing leniently", () => {
    expect(parseScopeString("profile bogus wat")).toEqual(["profile"]);
  });

  it("returns [] for empty/nullish scope strings", () => {
    expect(parseScopeString("")).toEqual([]);
    expect(parseScopeString(null)).toEqual([]);
    expect(parseScopeString(undefined)).toEqual([]);
  });

  it("throws on unknown scopes when parsing strictly", () => {
    expect(() => parseScopeStringStrict("profile bogus")).toThrow(
      UnknownScopeError,
    );
    expect(parseScopeStringStrict("profile projects:read")).toEqual([
      "profile",
      "projects:read",
    ]);
  });

  it("serializes and recognizes scopes", () => {
    expect(serializeScopes(["profile", "account:admin"])).toBe(
      "profile account:admin",
    );
    expect(isOAuthScope("account:admin")).toBe(true);
    expect(isOAuthScope("nope")).toBe(false);
  });
});

describe("redirectUriMatches", () => {
  it("matches exact URIs", () => {
    expect(
      redirectUriMatches("https://app.example/cb", "https://app.example/cb"),
    ).toBe(true);
  });

  it("ignores the port for loopback http redirects (RFC 8252)", () => {
    expect(
      redirectUriMatches(
        "http://127.0.0.1/callback",
        "http://127.0.0.1:54321/callback",
      ),
    ).toBe(true);
    expect(
      redirectUriMatches("http://localhost/cb", "http://localhost:8080/cb"),
    ).toBe(true);
  });

  it("does not ignore the port for non-loopback http", () => {
    expect(
      redirectUriMatches("http://example.com/cb", "http://example.com:99/cb"),
    ).toBe(false);
  });

  it("requires an exact match for https (port-sensitive)", () => {
    expect(
      redirectUriMatches(
        "https://app.example/cb",
        "https://app.example:8443/cb",
      ),
    ).toBe(false);
  });

  it("rejects path or scheme mismatches", () => {
    expect(
      redirectUriMatches("http://localhost/cb", "http://localhost:1/other"),
    ).toBe(false);
    expect(
      redirectUriMatches("https://app.example/cb", "http://app.example/cb"),
    ).toBe(false);
  });
});

describe("known-apps verification", () => {
  it("matches a first-party client id", () => {
    expect(resolveKnownApp({ clientId: "argos-cli" })?.id).toBe("argos-cli");
  });

  it("matches on client_uri host", () => {
    expect(resolveKnownApp({ clientUri: "https://claude.ai/app" })?.id).toBe(
      "claude",
    );
  });

  it("matches on a redirect host", () => {
    expect(
      resolveKnownApp({ redirectUris: ["https://cursor.com/callback"] })?.id,
    ).toBe("cursor");
  });

  it("does not verify from an unknown host or name alone", () => {
    expect(resolveKnownApp({ clientUri: "https://evil.example" })).toBeNull();
    expect(resolveKnownApp({})).toBeNull();
  });

  it("resolveClientVerification derives verified + knownAppId", () => {
    expect(resolveClientVerification({ clientId: "argos-cli" })).toEqual({
      knownAppId: "argos-cli",
      verified: true,
    });
    expect(
      resolveClientVerification({ clientUri: "https://evil.example" }),
    ).toEqual({ knownAppId: null, verified: false });
  });
});

describe("clients", () => {
  it("generates a namespaced public client id", () => {
    const id = generateClientId();
    expect(id).toMatch(/^oc_[a-z1-9]{32}$/);
    expect(generateClientId()).not.toBe(id);
  });
});

describe("metadata", () => {
  it("exposes RFC 8414 authorization server metadata", () => {
    const meta = getAuthorizationServerMetadata();
    expect(meta.issuer).toMatch(/^https?:\/\//);
    expect(meta.token_endpoint).toBe(`${meta.issuer}/oauth/token`);
    expect(meta.authorization_endpoint).toBe(`${meta.issuer}/oauth/authorize`);
    expect(meta.code_challenge_methods_supported).toEqual(["S256"]);
    expect(meta.grant_types_supported).toContain("authorization_code");
    expect(meta.grant_types_supported).toContain("refresh_token");
    expect(meta.scopes_supported).toEqual(OAUTH_SCOPE_LIST);
  });

  it("exposes RFC 9728 protected resource metadata pointing at the AS", () => {
    const prm = getProtectedResourceMetadata();
    const as = getAuthorizationServerMetadata();
    expect(prm.resource).toMatch(/\/v2$/);
    expect(prm.authorization_servers).toEqual([as.issuer]);
    expect(prm.scopes_supported).toEqual(OAUTH_SCOPE_LIST);
  });
});
