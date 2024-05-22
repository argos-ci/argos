import * as React from "react";
import { useLocation } from "react-router-dom";

import config from "@/config";
import { ButtonIcon, LinkButton, LinkButtonProps } from "@/ui/Button";

function useLoginUrl(redirect: string | null | undefined) {
  const { origin } = window.location;
  const { pathname } = useLocation();
  const callbackUrl = `${origin}/auth/gitlab/callback?r=${encodeURIComponent(
    redirect ?? pathname,
  )}`;
  return `${config.get("gitlab.loginUrl")}&redirect_uri=${encodeURIComponent(
    callbackUrl,
  )}`;
}

export function GitLabLogo(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      width="1em"
      height="1em"
      viewBox="0 0 24 22"
      aria-label="GitLab"
      {...props}
    >
      <path
        fill="currentColor"
        d="M1.279 8.29.044 12.294c-.117.367 0 .78.325 1.014l11.323 8.23-.009-.012-.03-.039L1.279 8.29zm21.713 5.018a.905.905 0 0 0 .325-1.014L22.085 8.29 11.693 21.52l11.299-8.212z"
      />
      <path
        fill="currentColor"
        d="m1.279 8.29 10.374 13.197.03.039.01-.006L22.085 8.29H1.28z"
        opacity={0.4}
      />
      <path
        fill="currentColor"
        d="m15.982 8.29-4.299 13.236-.004.011.014-.017L22.085 8.29h-6.103zm-8.606 0H1.279l10.374 13.197L7.376 8.29z"
        opacity={0.6}
      />
      <path
        fill="currentColor"
        d="m18.582.308-2.6 7.982h6.103L19.48.308c-.133-.41-.764-.41-.897 0zM1.279 8.29 3.88.308c.133-.41.764-.41.897 0l2.6 7.982H1.279z"
        opacity={0.4}
      />
    </svg>
  );
}

export function GitLabColoredLogo(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      width="1em"
      height="1em"
      aria-label="GitLab"
      viewBox="0 0 24 22"
      {...props}
    >
      <path
        fill="#FCA326"
        d="M1.279 8.29.044 12.294c-.117.367 0 .78.325 1.014l11.323 8.23-.009-.012-.03-.039L1.279 8.29zm21.713 5.018a.905.905 0 0 0 .325-1.014L22.085 8.29 11.693 21.52l11.299-8.212z"
      />
      <path
        fill="#E24329"
        d="m1.279 8.29 10.374 13.197.03.039.01-.006L22.085 8.29H1.28z"
      />
      <path
        fill="#FC6D26"
        d="m15.982 8.29-4.299 13.236-.004.011.014-.017L22.085 8.29h-6.103zm-8.606 0H1.279l10.374 13.197L7.376 8.29z"
      />
      <path
        fill="#E24329"
        d="m18.582.308-2.6 7.982h6.103L19.48.308c-.133-.41-.764-.41-.897 0zM1.279 8.29 3.88.308c.133-.41.764-.41.897 0l2.6 7.982H1.279z"
      />
    </svg>
  );
}

export function GitLabLoginButton({
  children,
  redirect,
  ...props
}: Omit<LinkButtonProps, "children" | "variant" | "href"> & {
  children?: React.ReactNode;
  redirect?: string | null;
}) {
  const loginUrl = useLoginUrl(redirect);
  return (
    <LinkButton variant="gitlab" href={loginUrl} {...props}>
      <ButtonIcon>
        <GitLabLogo />
      </ButtonIcon>
      {children ?? "Login with GitLab"}
    </LinkButton>
  );
}
