import config from "@/config";

/**
 * The scopes Argos asks for when installing the app: reading commits and
 * branches (merge base and parent commits), reading pull requests, writing
 * pull request comments, and writing check runs.
 */
const ORIGIN_APP_SCOPES = [
  "repository:contents:read",
  "repository:pull_requests:read",
  "repository:pull_requests:reviews:read",
  "repository:pull_requests:reviews:write",
  "repository:checks:read",
  "repository:checks:write",
] as const;

/**
 * The scope that lets Argos read the git history. Without it Argos relies on
 * the base commit and parent commits sent by the CLI, like the GitHub app
 * without content access.
 */
export const ORIGIN_CONTENTS_READ_SCOPE = "repository:contents:read";

/**
 * Get the URL of the install callback Origin redirects the admin to.
 */
function getOriginInstallCallbackUrl(): string {
  return new URL("/origin/install", config.get("api.baseUrl")).toString();
}

/**
 * Get the URL sending a workspace admin to install the Argos app.
 *
 * `state` comes back in the installation receipt: it carries the Argos
 * account the installation must be linked to.
 */
export function getOriginInstallUrl(input: { state: string }): string {
  const url = new URL(config.get("origin.installUrl"));
  url.searchParams.set("client_id", config.get("origin.appId"));
  url.searchParams.set("scope", ORIGIN_APP_SCOPES.join(" "));
  url.searchParams.set("redirect_uri", getOriginInstallCallbackUrl());
  url.searchParams.set("state", input.state);
  url.searchParams.set(
    "summary",
    "Argos reports visual changes on your pull requests.",
  );
  url.searchParams.set("include_granted_scopes", "true");
  return url.toString();
}

/**
 * Get the web URL of an Origin repository.
 */
export function getOriginRepositoryUrl(input: {
  ownerSlug: string;
  name: string;
}): string {
  return `${config.get("origin.webUrl")}/${input.ownerSlug}/${input.name}`;
}

/**
 * Get the web URL of a pull request on Origin.
 */
export function getOriginPullRequestUrl(input: {
  ownerSlug: string;
  name: string;
  number: number;
}): string {
  return `${getOriginRepositoryUrl(input)}/pull/${input.number}`;
}
