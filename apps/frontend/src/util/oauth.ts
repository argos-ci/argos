import { useMemo } from "react";
import { assertNever } from "@argos/util/assertNever";
import { useLocation } from "react-router-dom";

import config from "@/config";

import { getItem, setItem } from "./storage";

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
function generateSecureNonce(): string {
  const array = new Uint8Array(32);
  crypto.getRandomValues(array);
  return Array.from(array, (byte) => byte.toString(16).padStart(2, "0")).join(
    "",
  );
}

/**
 * Forge a state for OAuth with secure nonce generation.
 */
function createOAuthState(input: {
  provider: AuthProvider;
  redirect: string;
}): RawState {
  try {
    const nonce = generateSecureNonce();
    setItem(getOAuthNonceKey(input.provider), nonce);
    const state: OAuthState = { nonce, redirect: input.redirect };
    return window.btoa(JSON.stringify(state));
  } catch (error) {
    throw new Error("Failed to create OAuth state", { cause: error });
  }
}

function getLoginUrl(provider: AuthProvider): string {
  switch (provider) {
    case "github":
      return config.get("github.loginUrl");
    case "gitlab":
      return config.get("gitlab.loginUrl");
    case "google":
      return new URL("/auth/google/login", window.location.origin).toString();
    default:
      assertNever(provider);
  }
}

/**
 * Get the OAuth state for a provider.
 */
export function useOAuthState(input: {
  provider: AuthProvider;
  redirect: string | null;
}): string {
  const { provider } = input;
  const { pathname } = useLocation();
  const redirect = input.redirect ?? pathname;
  const state = useMemo(
    () => createOAuthState({ redirect, provider }),
    [redirect, provider],
  );
  return state;
}

/**
 * Get the OAuth URL for a provider.
 */
export function useOAuthURL(input: {
  provider: AuthProvider;
  redirect: string | null;
}): string {
  const { provider, redirect } = input;
  const loginUrl = getLoginUrl(provider);
  const state = useOAuthState({ provider, redirect });
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
    const storedNonce = getItem(getOAuthNonceKey(input.provider));
    if (!storedNonce || parsed.nonce !== storedNonce) {
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
