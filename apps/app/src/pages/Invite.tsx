import { useMutation } from "@apollo/client";
import { Helmet } from "react-helmet";
import { Navigate, useLocation, useParams } from "react-router-dom";

import { useQuery } from "@/containers/Apollo";
import { useIsLoggedIn } from "@/containers/Auth";
import { graphql } from "@/gql";
import { Button } from "@/ui/Button";
import { Container } from "@/ui/Container";
import { PageLoader } from "@/ui/PageLoader";

const useLoginUrl = () => {
  const { pathname } = useLocation();
  return `/login?r=${encodeURIComponent(pathname)}`;
};

const NavigateToLogin = () => {
  const loginUrl = useLoginUrl();
  return <Navigate to={loginUrl} replace />;
};

const InvitationQuery = graphql(`
  query Invite_invitation($token: String!) {
    invitation(token: $token) {
      id
      name
      slug
    }
  }
`);

const AcceptInvitationMutation = graphql(`
  mutation Invite_acceptInvitation($token: String!) {
    acceptInvitation(token: $token) {
      id
      slug
    }
  }
`);

const JoinTeamButton = (props: {
  token: string;
  children: React.ReactNode;
}) => {
  const [accept, { data, loading }] = useMutation(AcceptInvitationMutation, {
    variables: {
      token: props.token,
    },
  });
  if (data) {
    const team = data.acceptInvitation;
    if (team) {
      const teamUrl = `/${team.slug}`;
      return <Navigate to={teamUrl} replace />;
    }
  }
  return (
    <Button
      size="large"
      disabled={loading}
      onClick={() => {
        accept();
      }}
    >
      {props.children}
    </Button>
  );
};

const InvitePage = () => {
  const params = useParams();
  const token = params.inviteToken;
  if (!token) {
    throw new Error("No invite token");
  }
  const { data } = useQuery(InvitationQuery, {
    variables: {
      token,
    },
  });

  const team = data?.invitation;
  const teamName = team?.name || team?.slug;
  const teamTitle = teamName ? `${team?.name || team?.slug} Team` : `Team`;

  return (
    <>
      <Helmet>
        <title>{`Join ${teamTitle}`}</title>
      </Helmet>
      <Container className="mt-32 text-center">
        {data ? (
          data.invitation ? (
            <>
              <h1 className="mb-4 text-4xl font-medium">
                Join <strong>{teamTitle}</strong> on Argos.
              </h1>
              <p className="mb-10 text-xl">
                Let's use Argos to review visual differences in your
                applications.
              </p>
              <JoinTeamButton token={token}>Join {teamTitle}</JoinTeamButton>
            </>
          ) : (
            <>
              <h1 className="mb-4 text-4xl font-medium">Invalid invitation</h1>
              <p className="mb-10 text-xl">
                Team not found by the given invite code or user is not
                authorized to join team.
              </p>
            </>
          )
        ) : (
          <PageLoader />
        )}
      </Container>
    </>
  );
};

export const Invite = () => {
  const loggedIn = useIsLoggedIn();
  if (!loggedIn) {
    return <NavigateToLogin />;
  }
  return <InvitePage />;
};
