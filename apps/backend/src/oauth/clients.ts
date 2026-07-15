import { timingSafeEqual } from "node:crypto";

import { OAuthClient } from "@/database/models";
import { generateRandomString, hashToken } from "@/database/services/crypto";

import { resolveKnownApp } from "./known-apps";

/**
 * Look up a client by its public `client_id`.
 */
export async function getClientByClientId(
  clientId: string,
): Promise<OAuthClient | null> {
  return (await OAuthClient.query().findOne({ clientId })) ?? null;
}

const LOOPBACK_HOSTS = new Set(["localhost", "127.0.0.1", "::1"]);

function normalizeHost(hostname: string): string {
  // URL strips the brackets from IPv6 hosts (`[::1]` -> `::1`).
  return hostname.toLowerCase();
}

/**
 * Whether an actual `redirect_uri` matches a registered one.
 *
 * Registered URIs are matched exactly, except for loopback redirects
 * (RFC 8252 §7.3): a native client may vary the port at runtime, so for `http`
 * loopback hosts we compare everything *except* the port.
 */
export function redirectUriMatches(
  registered: string,
  actual: string,
): boolean {
  if (registered === actual) {
    return true;
  }
  let r: URL;
  let a: URL;
  try {
    r = new URL(registered);
    a = new URL(actual);
  } catch {
    return false;
  }
  const rHost = normalizeHost(r.hostname);
  const aHost = normalizeHost(a.hostname);
  const isLoopback =
    r.protocol === "http:" &&
    a.protocol === "http:" &&
    LOOPBACK_HOSTS.has(rHost) &&
    LOOPBACK_HOSTS.has(aHost) &&
    rHost === aHost;
  return (
    isLoopback &&
    r.pathname === a.pathname &&
    r.search === a.search &&
    r.hash === a.hash
  );
}

/**
 * Validate an actual `redirect_uri` against a client's registered URIs.
 */
export function validateRedirectUri(
  client: OAuthClient,
  redirectUri: string,
): boolean {
  return client.redirectUris.some((registered) =>
    redirectUriMatches(registered, redirectUri),
  );
}

/**
 * Constant-time comparison of two hex-encoded hashes of equal length.
 */
function safeCompareHash(a: string, b: string): boolean {
  if (a.length !== b.length) {
    return false;
  }
  return timingSafeEqual(Buffer.from(a), Buffer.from(b));
}

/**
 * Verify a client secret against the stored hash. Returns `false` for public
 * clients (no secret) or when the secret is missing/incorrect.
 */
export function verifyClientSecret(
  client: OAuthClient,
  providedSecret: string | null,
): boolean {
  if (!client.clientSecretHash || !providedSecret) {
    return false;
  }
  return safeCompareHash(client.clientSecretHash, hashToken(providedSecret));
}

/**
 * Whether a client authenticates with a secret (confidential) vs relies on PKCE
 * only (public).
 */
export function isConfidentialClient(client: OAuthClient): boolean {
  return client.tokenEndpointAuthMethod !== "none";
}

/**
 * Generate a fresh client secret and its stored hash (confidential clients).
 */
function generateClientSecret(): { secret: string; hash: string } {
  const secret = generateRandomString(48);
  return { secret, hash: hashToken(secret) };
}

/**
 * Generate a public `client_id` for a dynamically-registered client.
 */
export function generateClientId(): string {
  return `oc_${generateRandomString(32)}`;
}

/**
 * Resolve verification state (verified badge + official logo) for a client from
 * its metadata, using the curated known-apps registry. Self-asserted metadata
 * (like `client_name`) never confers verification on its own.
 */
export function resolveClientVerification(metadata: {
  clientId?: string | null;
  softwareId?: string | null;
  clientUri?: string | null;
  redirectUris?: string[] | null;
}): { knownAppId: string | null; verified: boolean } {
  const app = resolveKnownApp(metadata);
  return { knownAppId: app?.id ?? null, verified: app !== null };
}

export type DynamicClientRegistration = {
  clientName: string;
  redirectUris: string[];
  clientUri?: string | null | undefined;
  logoUri?: string | null | undefined;
  softwareId?: string | null | undefined;
  grantTypes?: string[] | undefined;
  responseTypes?: string[] | undefined;
  scope?: string | null | undefined;
  tokenEndpointAuthMethod?:
    "none" | "client_secret_basic" | "client_secret_post" | undefined;
};

/**
 * Create a dynamically-registered client (RFC 7591). Verification is derived
 * only from the curated known-apps registry — never from self-asserted values.
 */
export async function createDynamicClient(
  metadata: DynamicClientRegistration,
): Promise<{
  client: OAuthClient;
  clientSecret: string | null;
  registrationAccessToken: string;
}> {
  const clientId = generateClientId();
  const authMethod = metadata.tokenEndpointAuthMethod ?? "none";
  const secret = authMethod === "none" ? null : generateClientSecret();
  const registrationAccessToken = generateRandomString(40);
  const verification = resolveClientVerification({
    clientId,
    softwareId: metadata.softwareId ?? null,
    clientUri: metadata.clientUri ?? null,
    redirectUris: metadata.redirectUris,
  });

  const client = await OAuthClient.query().insertAndFetch({
    clientId,
    clientSecretHash: secret?.hash ?? null,
    clientName: metadata.clientName,
    clientUri: metadata.clientUri ?? null,
    logoUri: metadata.logoUri ?? null,
    redirectUris: metadata.redirectUris,
    grantTypes: metadata.grantTypes ?? ["authorization_code", "refresh_token"],
    responseTypes: metadata.responseTypes ?? ["code"],
    scope: metadata.scope ?? null,
    tokenEndpointAuthMethod: authMethod,
    softwareId: metadata.softwareId ?? null,
    isFirstParty: false,
    knownAppId: verification.knownAppId,
    verified: verification.verified,
    createdByUserId: null,
    registrationAccessTokenHash: hashToken(registrationAccessToken),
  });

  return {
    client,
    clientSecret: secret?.secret ?? null,
    registrationAccessToken,
  };
}
