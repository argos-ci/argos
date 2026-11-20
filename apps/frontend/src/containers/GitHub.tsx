import { assertNever } from "@argos/util/assertNever";
import { MarkGithubIcon } from "@primer/octicons-react";

import { config } from "@/config";
import { ButtonIcon, LinkButton, LinkButtonProps } from "@/ui/Button";
import { getOAuthURL } from "@/util/oauth";

type GitHubAppType = "main" | "light";

/**
 * Get the URL to install the main GitHub app. The installation ends on the
 * GitHub OAuth callback, so the server issues its state like a login's.
 */
export function getMainGitHubAppInstallURL() {
  const url = new URL("/auth/github/install", window.location.origin);
  url.searchParams.set("r", window.location.pathname);
  return url.toString();
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
      const appURL = new URL(config.githubLight.appUrl);
      // /installations/new lets you manage an app already installed too.
      const url = new URL(
        `${appURL.pathname}/installations/new`,
        appURL.origin,
      );
      url.searchParams.set(
        "state",
        JSON.stringify({ accountId: input.accountId }),
      );
      return url.toString();
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
  const url = getOAuthURL({ provider: "github", redirect: redirect ?? null });
  return (
    <LinkButton variant="github" href={url} {...props}>
      <ButtonIcon>
        <MarkGithubIcon />
      </ButtonIcon>
      {children ?? "Login with GitHub"}
    </LinkButton>
  );
}
