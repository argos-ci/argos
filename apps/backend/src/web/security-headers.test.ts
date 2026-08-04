import request from "supertest";
import { describe, expect, it } from "vitest";

import { createAppSecurityHeaders, getConnectSrc } from "./security-headers";
import { createTestApp } from "./test-util";

/** Parses a CSP header into directive -> values. */
function parseCsp(header: string): Record<string, string[]> {
  return Object.fromEntries(
    header
      .split(";")
      .map((part) => part.trim())
      .filter(Boolean)
      .map((part) => {
        const [name, ...values] = part.split(/\s+/);
        return [name!, values];
      }),
  );
}

async function getHeaders(
  options?: Partial<Parameters<typeof createAppSecurityHeaders>[0]>,
) {
  const app = createTestApp(
    createAppSecurityHeaders({
      configScriptCspHash: null,
      cspReportUri: null,
      ...options,
    }),
  );
  const response = await request(app).get("/");
  return response.headers;
}

async function getCsp(
  options?: Partial<Parameters<typeof createAppSecurityHeaders>[0]>,
) {
  const headers = await getHeaders(options);
  const header = headers["content-security-policy"];
  expect(header).toBeDefined();
  return parseCsp(header!);
}

describe("app security headers", () => {
  describe("framing", () => {
    it("denies framing outright via CSP", async () => {
      // Browsers prefer CSP over X-Frame-Options, so omitting this directive
      // let helmet's `'self'` default permit same-origin framing and made the
      // X-Frame-Options header below dead weight.
      const csp = await getCsp();
      expect(csp["frame-ancestors"]).toEqual(["'none'"]);
    });

    it("still sends X-Frame-Options for older browsers", async () => {
      const headers = await getHeaders();
      expect(headers["x-frame-options"]).toBe("DENY");
    });
  });

  describe("connect-src", () => {
    it("is not a wildcard", async () => {
      // `["'self'", "*"]` cancelled the `'self'` beside it, letting any XSS or
      // compromised dependency exfiltrate to any host.
      const csp = await getCsp();
      expect(csp["connect-src"]).toBeDefined();
      expect(csp["connect-src"]).not.toContain("*");
      expect(csp["connect-src"]).toContain("'self'");
    });

    it("allows the origins the app actually talks to", () => {
      const connectSrc = getConnectSrc();
      // Screenshots and text snapshots are fetched, not just displayed.
      expect(
        connectSrc.some((origin) => origin.includes("amazonaws.com")),
      ).toBe(true);
      // Subscriptions need an explicit WebSocket origin.
      expect(connectSrc.some((origin) => origin.startsWith("wss://"))).toBe(
        true,
      );
    });

    it("never emits a bare scheme or wildcard host", () => {
      for (const origin of getConnectSrc()) {
        expect(origin).not.toBe("*");
        expect(origin).not.toMatch(/^https?:$/);
        expect(origin).not.toMatch(/\*/);
      }
    });

    it("does not leak the Sentry DSN's credentials", () => {
      // A DSN is `https://<publicKey>@host/id`; only the origin belongs here.
      for (const origin of getConnectSrc()) {
        expect(origin).not.toContain("@");
      }
    });
  });

  describe("cross-origin isolation", () => {
    it("severs window.opener for cross-origin openers", async () => {
      const headers = await getHeaders();
      expect(headers["cross-origin-opener-policy"]).toBe(
        "same-origin-allow-popups",
      );
    });

    it("leaves COEP and CORP unset", async () => {
      // Both would break cross-origin subresources (screenshots, avatars) or
      // consumers embedding this origin's assets.
      const headers = await getHeaders();
      expect(headers["cross-origin-embedder-policy"]).toBeUndefined();
      expect(headers["cross-origin-resource-policy"]).toBeUndefined();
    });
  });

  describe("script-src", () => {
    it("authorises the inlined client config when the shell carries it", async () => {
      const hash = "'sha256-AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA='";
      const csp = await getCsp({ configScriptCspHash: hash });
      expect(csp["script-src"]).toContain(hash);
    });

    it("omits the hash when the config is not inlined", async () => {
      const csp = await getCsp({ configScriptCspHash: null });
      expect(csp["script-src"]?.join(" ")).not.toContain("sha256-AAAA");
    });

    it("never allows unsafe-inline scripts", async () => {
      const csp = await getCsp();
      expect(csp["script-src"]).not.toContain("'unsafe-inline'");
    });
  });

  describe("style-src and font-src", () => {
    it("does not allow all of https:", async () => {
      const csp = await getCsp();
      expect(csp["style-src"]).not.toContain("https:");
      expect(csp["font-src"]).not.toContain("https:");
    });

    it("serves fonts from this origin only", async () => {
      // Inter is self-hosted, so no third-party font origin is needed.
      const csp = await getCsp();
      expect(csp["font-src"]).toEqual(["'self'", "data:"]);
    });
  });

  describe("reporting", () => {
    it("omits report directives when no endpoint is configured", async () => {
      const csp = await getCsp({ cspReportUri: null });
      expect(csp["report-uri"]).toBeUndefined();
      expect(csp["report-to"]).toBeUndefined();
    });

    it("includes report directives when an endpoint is configured", async () => {
      const csp = await getCsp({ cspReportUri: "https://example.com/csp" });
      expect(csp["report-uri"]).toEqual(["https://example.com/csp"]);
      expect(csp["report-to"]).toEqual(["csp-endpoint"]);
    });
  });

  describe("Permissions-Policy", () => {
    it("denies APIs the app does not use", async () => {
      const headers = await getHeaders();
      const policy = headers["permissions-policy"];
      expect(policy).toBeDefined();
      for (const feature of [
        "camera",
        "microphone",
        "geolocation",
        "payment",
      ]) {
        expect(policy).toContain(`${feature}=()`);
      }
    });
  });
});
