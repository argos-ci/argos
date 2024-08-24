import { assertNever } from "@argos/util/assertNever";
import { MarkGithubIcon } from "@primer/octicons-react";
import { useLocation } from "react-router-dom";

import config from "@/config";
import { ButtonIcon, LinkButton, LinkButtonProps } from "@/ui/Button";

function useLoginUrl(redirect: string | null | undefined) {
  const { origin } = window.location;
  const { pathname } = useLocation();
  const callbackUrl = `${origin}/auth/github/callback?r=${encodeURIComponent(
    redirect ?? pathname,
  )}`;
  return `${config.get("github.loginUrl")}&redirect_uri=${encodeURIComponent(
    callbackUrl,
  )}`;
}

export function getInstallationUrl(app: "main" | "light") {
  const baseURL = () => {
    switch (app) {
      case "main":
        return config.get("github.appUrl");
      case "light":
        return config.get("githubLight.appUrl");
      default:
        assertNever(app);
    }
  };
  const url = new URL("/installations/new", baseURL());
  url.searchParams.set("state", window.location.pathname);
  return url.toString();
}

export function GitHubLoginButton({
  children,
  redirect,
  ...props
}: Omit<LinkButtonProps, "children"> & {
  children?: React.ReactNode;
  redirect?: string | null;
}) {
  const loginUrl = useLoginUrl(redirect);
  return (
    <LinkButton variant="github" href={loginUrl} {...props}>
      <ButtonIcon>
        <MarkGithubIcon />
      </ButtonIcon>
      {children ?? "Login with GitHub"}
    </LinkButton>
  );
}
