import { TEAM_AUTH_METHODS } from "@argos/schemas/team-auth-method";
import { Helmet } from "react-helmet";

import { TeamAuthMethodSignInButton } from "@/containers/Team/AuthMethodSignInButton";
import type { TeamAuthMethod } from "@/gql/graphql";
import { BrandShield } from "@/ui/BrandShield";
import { Container } from "@/ui/Container";

export function RequireTeamSignIn(props: {
  authMethod: TeamAuthMethod;
  teamSlug: string;
  redirect: string;
}) {
  const { authMethod, teamSlug, redirect } = props;
  return (
    <>
      <Helmet>
        <title>Sign in</title>
      </Helmet>

      <Container className="flex max-w-2xl flex-col items-center px-4 py-20">
        <BrandShield className="mb-6 w-20" />

        <h1 className="mb-8 text-3xl font-semibold">Sign-in required</h1>

        <p className="mb-8 text-center">
          The team <strong>{teamSlug}</strong> requires members to sign in with{" "}
          {TEAM_AUTH_METHODS[authMethod].requirement}.
        </p>

        <TeamAuthMethodSignInButton
          size="large"
          authMethod={authMethod}
          teamSlug={teamSlug}
          redirect={redirect}
        />
      </Container>
    </>
  );
}
