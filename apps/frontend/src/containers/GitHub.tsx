import { MarkGithubIcon } from "@primer/octicons-react";
import { memo } from "react";
import { useLocation } from "react-router-dom";

import config from "@/config";
import { Button, ButtonIcon, ButtonProps } from "@/ui/Button";

const useLoginUrl = (redirect: string | null | undefined) => {
  const { origin } = window.location;
  const { pathname } = useLocation();
  const callbackUrl = `${origin}/auth/github/callback?r=${encodeURIComponent(
    redirect ?? pathname,
  )}`;
  return `${config.get("github.loginUrl")}&redirect_uri=${encodeURIComponent(
    callbackUrl,
  )}`;
};

export const GitHubLoginButton = memo<
  Omit<ButtonProps, "children"> & {
    children?: React.ReactNode;
    redirect?: string | null;
  }
>(({ children, redirect, ...props }) => {
  const loginUrl = useLoginUrl(redirect);
  return (
    <Button color="github" {...props}>
      {(buttonProps) => (
        <a href={loginUrl} {...buttonProps}>
          <ButtonIcon>
            <MarkGithubIcon />
          </ButtonIcon>
          {children ?? "Login with GitHub"}
        </a>
      )}
    </Button>
  );
});
