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
    url = new URL(param, PARSE_BASE);
  } catch {
    return "/";
  }
  if (url.origin !== PARSE_BASE) {
    return "/";
  }
  return `${url.pathname}${url.search}${url.hash}`;
}
