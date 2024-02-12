import { FragmentType, graphql, useFragment } from "@/gql";
import { Button } from "@/ui/Button";
import { Card, CardBody, CardParagraph, CardTitle } from "@/ui/Card";
import { MarkGithubIcon } from "@primer/octicons-react";
import { ConfigureGitHubSSO } from "./GitHubSSO/Configure";
import { useMutation } from "@apollo/client";
import { TeamGitHubSso_TeamFragment } from "@/gql/graphql";
import { GithubAccountLink } from "../GithubAccountLink";

const TeamFragment = graphql(`
  fragment TeamGitHubSSO_Team on Team {
    id
    ssoGithubAccount {
      id
      ...GithubAccountLink_GithubAccount
    }
  }
`);

const DisableGitHubSSOMutation = graphql(`
  mutation ConfigureGitHubSSO_disableGitHubSSOOnTeam($teamAccountId: ID!) {
    disableGitHubSSOOnTeam(input: { teamAccountId: $teamAccountId }) {
      ...TeamGitHubSSO_Team
    }
  }
`);

export const TeamGitHubSSO = (props: {
  team: FragmentType<typeof TeamFragment>;
}) => {
  const team = useFragment(TeamFragment, props.team);
  const [disconnect] = useMutation(DisableGitHubSSOMutation, {
    variables: {
      teamAccountId: team.id,
    },
    optimisticResponse: {
      disableGitHubSSOOnTeam: {
        id: team.id,
        ssoGithubAccount: null,
      } as TeamGitHubSso_TeamFragment,
    },
    refetchQueries: ["TeamMembers_teamMembers"],
  });
  return (
    <Card>
      <CardBody>
        <CardTitle id="github-sso">GitHub Single Sign-On</CardTitle>
        <CardParagraph>
          Synchronize your team members with your GitHub organization.
        </CardParagraph>
        {team.ssoGithubAccount ? (
          <div>
            <div className="flex items-center gap-2 rounded border p-4">
              <MarkGithubIcon className="shrink-0 w-6 h-6" />
              <div className="flex-1 font-semibold">
                <GithubAccountLink githubAccount={team.ssoGithubAccount} />
              </div>
              <Button
                variant="outline"
                color="neutral"
                onClick={() => {
                  disconnect();
                }}
              >
                Disconnect
              </Button>
            </div>
          </div>
        ) : (
          <Card className="p-4">
            <ConfigureGitHubSSO teamAccountId={team.id} />
          </Card>
        )}
      </CardBody>
    </Card>
  );
};
