const WELCOME_PATH = "/~/welcome";

/**
 * Base used only to parse a relative redirect into its parts. Never navigated
 * to, and deliberately not the real origin: an absolute redirect keeps its own
 * host, which is what makes the check below see it as "not the team page".
 */
const PARSE_BASE = "http://parse.invalid";

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
    const url = new URL(redirect, PARSE_BASE);
    return (
      url.origin === PARSE_BASE &&
      url.pathname === "/teams/new" &&
      url.searchParams.get("autoSubmit") === "true"
    );
  } catch {
    return false;
  }
}

/**
 * Where a brand-new account should land after authenticating: the welcome page,
 * carrying the destination it should forward to once done.
 */
export function getPostSignupURL(redirect: string | null | undefined): string {
  if (!redirect) {
    return WELCOME_PATH;
  }
  if (checkCreatesTeam(redirect)) {
    return redirect;
  }
  const searchParams = new URLSearchParams({ r: redirect });
  return `${WELCOME_PATH}?${searchParams}`;
}

/**
 * The path the welcome page forwards to, read from its `r` parameter.
 *
 * Only same-origin paths are honoured. The parameter travels in a URL anyone can
 * hand to a freshly signed-up user, so accepting an absolute one would turn the
 * page into an open redirect. A protocol-relative `//host` names another origin,
 * and browsers normalise the backslash in `/\host` to a slash — both are refused
 * up front rather than left to `URL` parsing to catch.
 */
export function resolveWelcomeRedirect(param: string | null): string {
  if (
    !param ||
    !param.startsWith("/") ||
    param.startsWith("//") ||
    param.startsWith("/\\")
  ) {
    return "/";
  }
  return param;
}
