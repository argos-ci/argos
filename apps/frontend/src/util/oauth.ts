import { assertNever } from "@argos/util/assertNever";

import { config } from "@/config";
import * as storage from "@/util/storage";

type OAuthState = {
  nonce: string;
  redirect: string;
};

type RawState = string;

export type AuthProvider = "github" | "gitlab" | "google";

export function checkIsAuthProvider(
  provider: string,
): provider is AuthProvider {
  return ["github", "gitlab", "google"].includes(provider);
}

function getOAuthNonceKey(provider: AuthProvider): string {
  return `oauth.nonce.${provider}`;
}

/**
 * Generates a cryptographically secure random string.
 */
function getNonce(provider: AuthProvider): string {
  const key = getOAuthNonceKey(provider);
  const existing = storage.getItem(key);
  if (existing) {
    return existing;
  }
  const nonce = Math.random().toString(36).substring(2);
  storage.setItem(getOAuthNonceKey(provider), nonce);
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
    if (!storedNonce) {
      throw new Error("Missing stored OAuth state nonce");
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
