import { TEAM_AUTH_METHODS } from "@argos/schemas/team-auth-method";
import { assertNever } from "@argos/util/assertNever";
import { LockIcon } from "lucide-react";

import { GitHubLoginButton } from "@/containers/GitHub";
import { GoogleLoginButton } from "@/containers/Google";
import { TeamAuthMethod } from "@/gql/graphql";
import { ButtonIcon, LinkButton, type ButtonSize } from "@/ui/Button";
import { getSAMLLoginUrl } from "@/util/saml";

/**
 * Sign in again with a team's method and come back to `redirect`. It opens a
 * new session even when one is signed in, which is what a team requiring the
 * method checks.
 */
export function TeamAuthMethodSignInButton(props: {
  authMethod: TeamAuthMethod;
  teamSlug: string;
  redirect: string;
  size?: ButtonSize;
  className?: string;
}) {
  const { authMethod, teamSlug, redirect, ...buttonProps } = props;
  const label = `Sign in with ${TEAM_AUTH_METHODS[authMethod].label}`;
  switch (authMethod) {
    case TeamAuthMethod.Google:
      return (
        <GoogleLoginButton redirect={redirect} reauthenticate {...buttonProps}>
          {label}
        </GoogleLoginButton>
      );
    case TeamAuthMethod.Github:
      return (
        <GitHubLoginButton redirect={redirect} reauthenticate {...buttonProps}>
          {label}
        </GitHubLoginButton>
      );
    case TeamAuthMethod.Saml:
      return (
        <LinkButton
          href={getSAMLLoginUrl({ teamSlug, redirect })}
          {...buttonProps}
        >
          <ButtonIcon>
            <LockIcon />
          </ButtonIcon>
          {label}
        </LinkButton>
      );
    default:
      assertNever(authMethod);
  }
}
