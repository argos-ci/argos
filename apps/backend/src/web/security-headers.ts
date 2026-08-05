import type { RequestHandler } from "express";
import helmet from "helmet";

import config from "@/config";

/**
 * Security headers for the app domain: the SPA shell and its static assets.
 *
 * Separate from the `/graphql` helmet block, which guards an API with quite
 * different needs, and kept out of `app-router` so it can be asserted on
 * directly — see `security-headers.test.ts`.
 */
export function createAppSecurityHeaders(options: {
  /**
   * CSP hash authorising the inlined client config, or null when the shell
   * still requests `/config.js` separately.
   */
  configScriptCspHash: string | null;
  /** CSP violation endpoint, or null when reporting is not configured. */
  cspReportUri: string | null;
}): RequestHandler[] {
  const { configScriptCspHash, cspReportUri } = options;
  return [
    helmet({
      // https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Content-Security-Policy
      contentSecurityPolicy: {
        directives: {
          "default-src": ["'self'"],
          // Without this, helmet's default `'self'` applies and browsers that
          // prefer CSP over X-Frame-Options allow same-origin framing, which
          // would make the `frameguard: deny` below dead weight.
          "frame-ancestors": ["'none'"],
          "img-src": [
            "'self'",
            "data:",
            "blob:",
            "https://argos-ci.com",
            // ImageKit images
            "https://files.argos-ci.com",
            // S3 images
            getScreenshotsBucketOrigin(),
            // GitHub and GitLab avatars
            "https://github.com",
            "https://avatars.githubusercontent.com",
            "https://gitlab.com",
            "https://secure.gravatar.com",
          ],
          "worker-src": ["'self'", "blob:"],
          "script-src": [
            "'self'",
            // Script to update color classes
            "'sha256-3eiqAvd5lbIOVQdobPBczwuRAhAf7/oxg3HH2aFmp8Y='",
            ...(configScriptCspHash ? [configScriptCspHash] : []),
            ...config.get("csp.scriptSrc"),
          ],
          "connect-src": getConnectSrc(),
          // Narrower than helmet's defaults, which allow all of `https:`.
          // `unsafe-inline` stays: React and react-aria both set style
          // attributes, and there is no way to hash those.
          "style-src": ["'self'", "'unsafe-inline'"],
          // Fonts are self-hosted, so no third-party origin is needed.
          "font-src": ["'self'", "data:"],
          ...(cspReportUri
            ? { "report-to": ["csp-endpoint"], "report-uri": [cspReportUri] }
            : {}),
        },
      },
      // Severs `window.opener` when a cross-origin page opens the app, closing
      // the tabnabbing and XS-Leaks surface that leaving this off allowed.
      // `-allow-popups` rather than plain `same-origin` so popups the app opens
      // keep working; the OAuth flows are top-level redirects, not popups, so
      // either would do, but this is the compatible default.
      crossOriginOpenerPolicy: { policy: "same-origin-allow-popups" },
      // COEP stays off: it would require CORP or CORS on every cross-origin
      // subresource (screenshots on the image CDN and S3, avatars).
      crossOriginEmbedderPolicy: false,
      // CORP stays off until it is confirmed that nothing embeds assets from
      // this origin — argos-ci.com or the docs site would break if they do.
      crossOriginResourcePolicy: false,
      frameguard: {
        action: "deny", // Disallow embedded iframe
      },
    }),
    // Helmet has no Permissions-Policy support, and the app uses none of these.
    (_req, res, next) => {
      res.setHeader(
        "Permissions-Policy",
        "camera=(), microphone=(), geolocation=(), payment=()",
      );
      next();
    },
  ];
}

/** Virtual-hosted-style origin of the screenshots bucket. */
function getScreenshotsBucketOrigin(): string {
  return `https://${config.get("s3.screenshotsBucket")}.s3.${config.get("s3.region")}.amazonaws.com`;
}

/**
 * Adds a URL's origin to `origins`, ignoring values that are unset or unparsable
 * so a blank config entry cannot widen or break the policy.
 */
function addOrigin(origins: Set<string>, value: string): void {
  if (!value) {
    return;
  }
  try {
    origins.add(new URL(value).origin);
  } catch {
    // Not a URL (or a bare path): nothing to authorise.
  }
}

/**
 * Origins the app's own JavaScript may open connections to.
 *
 * This used to be `["'self'", "*"]`, where the `*` cancelled the `'self'` beside
 * it and left the directive meaningless — any XSS or compromised dependency
 * could exfiltrate to any host it liked.
 *
 * Derived from config rather than written out, so it cannot drift from where the
 * app actually talks.
 */
export function getConnectSrc(): string[] {
  const origins = new Set<string>(["'self'"]);

  // GraphQL subscriptions open a WebSocket back to the page's own origin. CSP 3
  // has `'self'` cover ws/wss on the same host, but browsers have not always
  // agreed, so name it explicitly too.
  try {
    const serverUrl = new URL(config.get("server.url"));
    origins.add(`wss://${serverUrl.host}`);
    if (serverUrl.protocol === "http:") {
      origins.add(`ws://${serverUrl.host}`);
    }
  } catch {
    // Malformed server.url: `'self'` still covers the same-origin socket.
  }

  // `fetchApi` calls the API host, a separate origin in production.
  addOrigin(origins, config.get("api.baseUrl"));

  // Screenshots and text snapshots are *fetched*, not just displayed — for pixel
  // diffing, colour detection and text diffs — so they need connect-src as well
  // as img-src. Images come from the image CDN when small enough
  // (`publicImageBaseUrl`); everything larger, and every non-image file, comes
  // from a signed S3 URL. See `storage/public-url.ts`.
  addOrigin(origins, config.get("s3.publicImageBaseUrl"));
  origins.add(getScreenshotsBucketOrigin());

  // Sentry posts envelopes to its DSN's ingest host.
  addOrigin(origins, config.get("sentry.clientDsn"));

  return Array.from(origins);
}
