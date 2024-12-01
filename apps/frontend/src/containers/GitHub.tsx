import { useMemo } from "react";
import { assertNever } from "@argos/util/assertNever";
import { MarkGithubIcon } from "@primer/octicons-react";

import config from "@/config";
import { ButtonIcon, LinkButton, LinkButtonProps } from "@/ui/Button";
import { getOAuthState, getOAuthURL } from "@/util/oauth";

type GitHubAppType = "main" | "light";

/**
 * Get the URL to install the GitHub app.
 */
function getGitHubAppInstallBaseURL(app: GitHubAppType) {
  const baseURL = (() => {
    switch (app) {
      case "main":
        return new URL(config.get("github.appUrl"));
      case "light":
        return new URL(config.get("githubLight.appUrl"));
      default:
        assertNever(app);
    }
  })();
  // /installations/new let you manage the installed app
  // that's why we use it here
  return new URL(`${baseURL.pathname}/installations/new`, baseURL.origin);
}

/**
 * Get the URL to install the main GitHub app.
 */
export function getMainGitHubAppInstallURL() {
  const baseURL = getGitHubAppInstallBaseURL("main");
  const state = getOAuthState({ provider: "github", redirect: null });
  baseURL.searchParams.set("state", state);
  return baseURL.toString();
}

/**
 * Get the URL to install or manage the GitHub app.
 */
export function getGitHubAppInstallURL(
  app: GitHubAppType,
  input: { accountId: string },
) {
  switch (app) {
    case "main": {
      return getMainGitHubAppInstallURL();
    }
    case "light": {
      const baseURL = getGitHubAppInstallBaseURL(app);
      const state = JSON.stringify({ accountId: input.accountId });
      baseURL.searchParams.set("state", state);
      return baseURL.toString();
    }
    default:
      assertNever(app);
  }
}

export function GitHubLoginButton({
  children,
  redirect,
  ...props
}: Omit<LinkButtonProps, "children"> & {
  children?: React.ReactNode;
  redirect?: string | null;
}) {
  const url = useMemo(
    () =>
      getOAuthURL({
        provider: "github",
        redirect: redirect ?? null,
      }),
    [redirect],
  );
  return (
    <LinkButton variant="github" href={url} {...props}>
      <ButtonIcon>
        <MarkGithubIcon />
      </ButtonIcon>
      {children ?? "Login with GitHub"}
    </LinkButton>
  );
}
