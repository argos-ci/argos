import { MarkGithubIcon } from "@primer/octicons-react";
import { memo } from "react";
import { useLocation } from "react-router-dom";

import { Button, Icon } from "../components";
import config from "../config";

const useLoginUrl = () => {
  const { origin } = window.location;
  const { pathname } = useLocation();
  return `${config.get(
    "github.loginUrl"
  )}&redirect_uri=${origin}/auth/github/callback?r=${encodeURIComponent(
    pathname
  )}`;
};

export const GitHubLoginButton = memo(() => {
  const loginUrl = useLoginUrl();
  return (
    <Button as="a" href={loginUrl} color="secondary" gap={2}>
      <Icon as={MarkGithubIcon} />
      Login
    </Button>
  );
});
