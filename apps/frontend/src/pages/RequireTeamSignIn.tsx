import { TEAM_AUTH_METHOD_LABELS } from "@argos/schemas/team-auth-method";
import { invariant } from "@argos/util/invariant";
import { Helmet } from "react-helmet";
import { useParams } from "react-router";

import { TeamAuthMethodSignInButton } from "@/containers/Team/AuthMethodSignInButton";
import type { TeamAuthMethod } from "@/gql/graphql";
import { BrandShield } from "@/ui/BrandShield";
import { Container } from "@/ui/Container";

export function RequireTeamSignIn(props: { authMethod: TeamAuthMethod }) {
  const params = useParams();
  invariant(
    params.accountSlug,
    "Account slug should be set if we are on this page",
  );
  return (
    <RequireTeamSignInContent
      authMethod={props.authMethod}
      teamSlug={params.accountSlug}
      redirect={window.location.pathname}
    />
  );
}

export function RequireTeamSignInContent(props: {
  authMethod: TeamAuthMethod;
  teamSlug: string;
  redirect: string;
}) {
  const { authMethod, teamSlug, redirect } = props;
  const label = TEAM_AUTH_METHOD_LABELS[authMethod];
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
          {label}.
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
