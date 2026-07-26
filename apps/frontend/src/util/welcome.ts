import { getAutoInviteTeamsURL } from "@/util/auto-invite";

const WELCOME_PATH = "/~/welcome";

/**
 * Origin a redirect is resolved against, and the only one a redirect may land
 * on.
 *
 * The app's own origin rather than a sentinel, because callers legitimately pass
 * absolute same-origin URLs: `AuthCLI` and `OAuthAuthorize` both send
 * `?r=${encodeURIComponent(window.location.href)}` so they can be returned to
 * after login. Resolving those against a sentinel would classify them as
 * off-origin and drop them.
 */
function getOrigin(): string {
  return window.location.origin;
}

/**
 * Whether a post-signup target creates a team on its own.
 *
 * Team creation routes through the welcome page itself once the team exists (see
 * the `createTeam` mutation), because the page can only offer email-domain
 * auto-join for a team that is already there. Wrapping such a target here would
 * ask the questions too early, so it is handed back untouched.
 */
function checkCreatesTeam(redirect: string): boolean {
  try {
    const url = new URL(redirect, getOrigin());
    return (
      url.origin === getOrigin() &&
      url.pathname === "/teams/new" &&
      url.searchParams.get("autoSubmit") === "true"
    );
  } catch {
    return false;
  }
}

/**
 * Where an account should land after authenticating.
 *
 * The whole decision lives here so the OAuth callback and the email-code flow
 * cannot drift apart, and so the team-creation case is recognised before the
 * auto-invite detour wraps the destination out of sight.
 */
export function getPostAuthURL(input: {
  creation: boolean;
  hasAutoInvite: boolean;
  redirect: string | null | undefined;
}): string {
  const { creation, hasAutoInvite, redirect } = input;

  if (!creation) {
    return redirect ?? "/";
  }

  // Checked against the original destination. Once `getAutoInviteTeamsURL` has
  // wrapped it, the team-creation target is buried in a nested `r=` param and
  // this no longer sees it — which sent the user to the welcome page before any
  // team existed, so the domain question could never be asked and `createTeam`
  // then skipped its own welcome hop.
  if (redirect && checkCreatesTeam(redirect)) {
    return redirect;
  }

  const destination = hasAutoInvite
    ? getAutoInviteTeamsURL(redirect)
    : redirect;
  // Left off when there is nowhere in particular to go: the welcome page already
  // falls back to the root, so `?r=%2F` would only be noise in the URL.
  if (!destination) {
    return WELCOME_PATH;
  }
  const searchParams = new URLSearchParams({ r: destination });
  return `${WELCOME_PATH}?${searchParams}`;
}

/**
 * The path the welcome page forwards to, read from its `r` parameter.
 *
 * Only same-origin destinations are honoured: the parameter travels in a URL
 * anyone can hand to a freshly signed-up user, so one that leaves the origin
 * would make this an open redirect.
 *
 * The check resolves the value with the same parser the browser will use and
 * requires the result to stay on the origin, rather than pattern-matching the
 * string. Pattern-matching cannot see what the parser does before it resolves a
 * reference: it strips tab, LF and CR first, so a value that looks like a path
 * can become `//evil.test` and leave the origin. Only the parsed parts are
 * returned, so the caller navigates to something already normalised.
 */
export function resolveWelcomeRedirect(param: string | null): string {
  if (!param) {
    return "/";
  }
  let url: URL;
  try {
    url = new URL(param, getOrigin());
  } catch {
    return "/";
  }
  if (url.origin !== getOrigin()) {
    return "/";
  }
  return `${url.pathname}${url.search}${url.hash}`;
}
