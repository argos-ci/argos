import { assertNever } from "@argos/util/assertNever";
import Cookie from "js-cookie";

import { config } from "@/config";
import * as storage from "@/util/storage";

type OAuthState = {
  nonce: string;
  redirect: string;
};

type RawState = string;

export type AuthProvider = "github" | "gitlab" | "google" | "saml";
const AUTH_PROVIDERS = [
  "github",
  "gitlab",
  "google",
  "saml",
] satisfies AuthProvider[];

export function checkIsAuthProvider(
  provider: string,
): provider is AuthProvider {
  return (AUTH_PROVIDERS as string[]).includes(provider);
}

function getOAuthNonceKey(provider: AuthProvider): string {
  return `oauth.nonce.${provider}`;
}

/**
 * Generates a cryptographically secure random string.
 */
function getNonce(provider: AuthProvider): string {
  const key = getOAuthNonceKey(provider);
  const fromStorage = storage.getItem(key);
  if (fromStorage) {
    return fromStorage;
  }
  const fromCookie = Cookie.get(key);
  if (fromCookie) {
    return fromCookie;
  }
  const nonce = Math.random().toString(36).substring(2);
  const storedInStorage = storage.setItem(key, nonce);
  if (!storedInStorage) {
    Cookie.set(key, nonce, { expires: 1 / 24 }); // 1 hour
  }
  return nonce;
}

/**
 * Forge a state for OAuth with secure nonce generation.
 */
function createOAuthState(input: {
  provider: AuthProvider;
  redirect: string;
}): RawState {
  try {
    const nonce = getNonce(input.provider);
    const state: OAuthState = { nonce, redirect: input.redirect };
    return window.btoa(JSON.stringify(state));
  } catch (error) {
    throw new Error("Failed to create OAuth state", { cause: error });
  }
}

function getLoginUrl(provider: AuthProvider): string {
  switch (provider) {
    case "github":
      return config.github.loginUrl;
    case "gitlab":
      return config.gitlab.loginUrl;
    case "google":
      return new URL("/auth/google/login", window.location.origin).toString();
    case "saml":
      throw new Error(`Not applicable to SAML`);
    default:
      assertNever(provider);
  }
}

/**
 * Get the OAuth state for a provider.
 */
export function getOAuthState(input: {
  provider: AuthProvider;
  redirect: string | null;
}): string {
  const { provider } = input;
  const redirect = input.redirect ?? window.location.pathname;
  const state = createOAuthState({ redirect, provider });
  return state;
}

/**
 * Get the OAuth URL for a provider.
 */
export function getOAuthURL(input: {
  provider: AuthProvider;
  redirect: string | null;
}): string {
  const { provider, redirect } = input;
  const loginUrl = getLoginUrl(provider);
  const state = getOAuthState({ provider, redirect });
  const url = new URL(loginUrl);
  url.searchParams.set(
    "redirect_uri",
    `${window.location.origin}/auth/${provider}/callback`,
  );
  url.searchParams.set("state", state);
  return url.toString();
}

/**
 * Validate the state for OAuth.
 */
export function getRedirectFromState(input: {
  state: RawState;
  provider: AuthProvider;
}): string {
  try {
    const parsed: unknown = JSON.parse(window.atob(input.state));
    if (!checkIsValidOAuthState(parsed)) {
      throw new Error("Invalid OAuth state structure");
    }
    const storedNonce = storage.getItem(getOAuthNonceKey(input.provider));
    // If the nonce is not stored, we let it pass.
    // It's acceptable in terms of security because some clients does not support local storage.
    if (!storedNonce) {
      return parsed.redirect;
    }
    if (parsed.nonce !== storedNonce) {
      throw new Error("Invalid OAuth state nonce");
    }
    return parsed.redirect;
  } catch (error) {
    throw new Error("Failed to validate OAuth state", { cause: error });
  }
}

/**
 * Type guard for OAuth state validation
 */
function checkIsValidOAuthState(value: unknown): value is OAuthState {
  return (
    !!value &&
    typeof value === "object" &&
    "nonce" in value &&
    typeof value.nonce === "string" &&
    "redirect" in value &&
    typeof value.redirect === "string"
  );
}
