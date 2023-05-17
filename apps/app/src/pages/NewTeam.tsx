import { useApolloClient } from "@apollo/client";
import { Helmet } from "react-helmet";
import { useNavigate, useSearchParams } from "react-router-dom";

import { useQuery } from "@/containers/Apollo";
import { useAuthTokenPayload } from "@/containers/Auth";
import { TeamNewForm } from "@/containers/Team/NewForm";
import { graphql } from "@/gql";
import { Container } from "@/ui/Container";
import { PageLoader } from "@/ui/PageLoader";
import { Heading, Headline } from "@/ui/Typography";

const MeQuery = graphql(`
  query NewTeam_me {
    me {
      id
      hasSubscribedToTrial
    }
  }
`);

const createProPlanCheckoutSessionMutation = graphql(`
  mutation NewTeam_createProPlanCheckoutSession($teamId: ID!) {
    createProPlanCheckoutSession(teamId: $teamId)
  }
`);

export const NewTeam = () => {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const name = decodeURIComponent(params.get("name") || "");
  const auth = useAuthTokenPayload();
  const { data } = useQuery(MeQuery);
  const client = useApolloClient();

  if (!data) {
    return <PageLoader />;
  }

  if (!data.me) {
    throw new Error("Not logged in");
  }

  return (
    <>
      <Helmet>
        <title>New Team</title>
      </Helmet>
      <Container>
        <Heading className="mt-11">New Team</Heading>
        <Headline>
          Create a team for collaboration on shared projects with your
          colleagues.
          <br />A Pro plan is required to create and build a team's project.
        </Headline>

        {auth && (
          <div className="mt-4 max-w-2xl">
            <TeamNewForm
              onCreate={async (team) => {
                const { data } = await client.mutate({
                  mutation: createProPlanCheckoutSessionMutation,
                  variables: { teamId: team.id },
                });

                const sessionUrl = data?.createProPlanCheckoutSession;
                if (!sessionUrl) {
                  navigate(`/${team.slug}`);
                } else {
                  window.location.href = sessionUrl;
                }
              }}
              defaultTeamName={
                name || `${auth.account.name || auth.account.slug}'s Team`
              }
              trial={!data.me.hasSubscribedToTrial}
            />
          </div>
        )}
      </Container>
    </>
  );
};
