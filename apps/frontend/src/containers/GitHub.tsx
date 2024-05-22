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
