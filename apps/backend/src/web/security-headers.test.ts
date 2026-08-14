import request from "supertest";
import { afterEach, describe, expect, it } from "vitest";

import config from "@/config";

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

    it("allows the screenshots bucket, matched on its whole host", () => {
      // Screenshots and text snapshots are fetched, not just displayed, so the
      // bucket needs connect-src as well as img-src.
      //
      // Asserted by parsing each entry and anchoring the host, rather than
      // searching for "amazonaws.com" as a substring: that would also pass for
      // `https://amazonaws.com.attacker.test`, so it proves nothing about the
      // origin actually being allowed.
      const hosts = getConnectSrc()
        .filter((origin) => origin.startsWith("https://"))
        .map((origin) => new URL(origin).host);
      expect(
        hosts.some((host) =>
          /^[\w.-]+\.s3\.[\w-]+\.amazonaws\.com$/.test(host),
        ),
      ).toBe(true);
    });

    it("allows an explicit WebSocket origin for subscriptions", () => {
      expect(
        getConnectSrc().some((origin) => origin.startsWith("wss://")),
      ).toBe(true);
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

  describe("media-src", () => {
    const originalBaseUrl = config.get("s3.publicImageBaseUrl");

    afterEach(() => {
      config.set("s3.publicImageBaseUrl", originalBaseUrl);
    });

    it("allows the origins a recording plays from", async () => {
      // Media has no fallback to `img-src`, only to `default-src`. Without the
      // directive, `'self'` there refused every video in the media library:
      // the element failed to load without a request ever being made.
      config.set(
        "s3.publicImageBaseUrl",
        "https://files.argos-ci.com/production/",
      );
      const csp = await getCsp();
      expect(csp["media-src"]).toContain("'self'");
      expect(csp["media-src"]).toContain("https://files.argos-ci.com");
    });

    it("reaches everywhere a poster frame is served from", async () => {
      // A recording and its poster are one upload served two ways, so an origin
      // one directive can reach and the other cannot leaves a video that shows
      // its first frame and then refuses to play.
      config.set(
        "s3.publicImageBaseUrl",
        "https://files.argos-ci.com/production/",
      );
      const csp = await getCsp();
      for (const origin of csp["media-src"] ?? []) {
        expect(csp["img-src"]).toContain(origin);
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
      // Inter is self-hosted, and with no asset CDN configured it is served
      // from this origin like everything else.
      const csp = await getCsp();
      expect(csp["font-src"]).toEqual(["'self'", "data:"]);
    });
  });

  describe("asset origin", () => {
    const originalBaseUrl = config.get("assets.baseUrl");

    afterEach(() => {
      config.set("assets.baseUrl", originalBaseUrl);
    });

    it("authorises the CDN for every directive that can name an asset", async () => {
      config.set("assets.baseUrl", "https://assets.argos-ci.com");
      const csp = await getCsp();
      // Scripts and styles are the build output; fonts ship inside it via
      // `@fontsource-variable/inter`; images cover anything Vite emits to
      // `assets/`; `connect-src` is how DevTools fetches the source maps the
      // chunks point at. Miss one and that resource type breaks on deploy.
      expect(csp["script-src"]).toContain("https://assets.argos-ci.com");
      expect(csp["style-src"]).toContain("https://assets.argos-ci.com");
      expect(csp["font-src"]).toContain("https://assets.argos-ci.com");
      expect(csp["img-src"]).toContain("https://assets.argos-ci.com");
      expect(csp["connect-src"]).toContain("https://assets.argos-ci.com");
    });

    it("does not authorise the CDN for workers", async () => {
      // A worker's top-level script has to be same-origin no matter what CORS
      // says, so the colour-detection worker is inlined as a blob instead of
      // loaded from the CDN. Widening this directive would not make a
      // cross-origin worker load — it would just hide why.
      config.set("assets.baseUrl", "https://assets.argos-ci.com");
      const csp = await getCsp();
      expect(csp["worker-src"]).toEqual(["'self'", "blob:"]);
    });

    it("authorises the origin, not the path", async () => {
      // CSP source expressions match on origin; a path here would either be
      // ignored or narrow the directive in ways nobody intended.
      config.set("assets.baseUrl", "https://assets.argos-ci.com/build/");
      const csp = await getCsp();
      expect(csp["script-src"]).toContain("https://assets.argos-ci.com");
      expect(csp["script-src"]?.join(" ")).not.toContain("/build");
    });

    it("adds nothing when no CDN is configured", async () => {
      config.set("assets.baseUrl", "");
      const csp = await getCsp();
      expect(csp["style-src"]).toEqual(["'self'", "'unsafe-inline'"]);
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
