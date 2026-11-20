import { resolveWelcomeRedirect } from "@/util/welcome";

type OAuthState = {
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

/**
 * Get the URL that starts an OAuth flow. The server issues the state and binds
 * it to this browser before sending it on to the provider.
 */
export function getOAuthURL(input: {
  provider: Exclude<AuthProvider, "saml">;
  redirect: string | null;
}): string {
  const url = new URL(`/auth/${input.provider}/login`, window.location.origin);
  url.searchParams.set("r", input.redirect ?? window.location.pathname);
  return url.toString();
}

/**
 * Read where to land after authenticating. The state comes from the callback
 * URL, which anyone can craft, and the error page uses it before the server has
 * checked it, so only a same-origin path is returned.
 */
export function getRedirectFromState(state: RawState): string {
  try {
    const parsed: unknown = JSON.parse(window.atob(state));
    if (!checkIsValidOAuthState(parsed)) {
      throw new Error("Invalid OAuth state structure");
    }
    return resolveWelcomeRedirect(parsed.redirect);
  } catch (error) {
    throw new Error("Failed to read OAuth state", { cause: error });
  }
}

function checkIsValidOAuthState(value: unknown): value is OAuthState {
  return (
    !!value &&
    typeof value === "object" &&
    "redirect" in value &&
    typeof value.redirect === "string"
  );
}
