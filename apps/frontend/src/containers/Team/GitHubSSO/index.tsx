import { memo } from "react";
import { useMutation } from "@apollo/client";
import { MarkGithubIcon } from "@primer/octicons-react";

import { GITHUB_SSO_PRICING } from "@/constants";
import { GithubAccountLink } from "@/containers/GithubAccountLink";
import { DocumentType, graphql } from "@/gql";
import {
  AccountSubscriptionStatus,
  TeamGitHubSso_TeamFragment,
} from "@/gql/graphql";
import { Button } from "@/ui/Button";
import {
  Card,
  CardBody,
  CardFooter,
  CardParagraph,
  CardTitle,
} from "@/ui/Card";
import {
  Dialog,
  DialogBody,
  DialogDismiss,
  DialogFooter,
  DialogText,
  DialogTitle,
  DialogTrigger,
} from "@/ui/Dialog";
import { getGraphQLErrorMessage } from "@/ui/Form";
import { FormError } from "@/ui/FormError";
import { Modal } from "@/ui/Modal";

import { ConfigureGitHubSSO } from "./Configure";

const _TeamFragment = graphql(`
  fragment TeamGitHubSSO_Team on Team {
    id
    plan {
      id
      displayName
      usageBased
      githubSsoIncluded
    }
    subscriptionStatus
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

const DisableButton = memo(function DisableButton(props: {
  teamAccountId: string;
}) {
  const [disable, { error, loading }] = useMutation(DisableGitHubSSOMutation, {
    variables: {
      teamAccountId: props.teamAccountId,
    },
    optimisticResponse: {
      disableGitHubSSOOnTeam: {
        id: props.teamAccountId,
        ssoGithubAccount: null,
      } as TeamGitHubSso_TeamFragment,
    },
    refetchQueries: ["TeamMembers_teamMembers"],
  });
  return (
    <DialogTrigger>
      <Button variant="secondary">Disable</Button>
      <Modal>
        <Dialog>
          <DialogBody confirm>
            <DialogTitle>Disable GitHub Single Sign-On</DialogTitle>
            <DialogText>
              You are about to disable GitHub Single Sign-On on your Team.
            </DialogText>
            <DialogText>Are you sure you want to continue?</DialogText>
          </DialogBody>
          <DialogFooter>
            {error && <FormError>{getGraphQLErrorMessage(error)}</FormError>}
            <DialogDismiss>Cancel</DialogDismiss>
            <Button
              isDisabled={loading}
              onPress={() => {
                disable().catch(() => {});
              }}
            >
              Disable
            </Button>
          </DialogFooter>
        </Dialog>
      </Modal>
    </DialogTrigger>
  );
});

export function TeamGitHubSSO(props: {
  team: DocumentType<typeof _TeamFragment>;
}) {
  const { team } = props;
  const hasActiveSubscription =
    team.subscriptionStatus === AccountSubscriptionStatus.Active;
  const priced = !team.plan?.githubSsoIncluded;
  const usageBased = team.plan?.usageBased;
  return (
    <Card>
      <CardBody>
        <CardTitle id="github-sso">GitHub Single Sign-On</CardTitle>
        <CardParagraph>
          Synchronize your team members with your GitHub organization.
        </CardParagraph>
        {team.ssoGithubAccount && (
          <div>
            <div className="flex items-center gap-2 rounded-sm border p-4">
              <MarkGithubIcon className="size-6 shrink-0" />
              <div className="flex-1 font-semibold">
                <GithubAccountLink githubAccount={team.ssoGithubAccount} />
              </div>
            </div>
          </div>
        )}
      </CardBody>
      <CardFooter className="flex items-center justify-between gap-4">
        {priced ? (
          <div>
            This feature is available as part of GitHub SSO for Teams, available
            for an additional <strong>${GITHUB_SSO_PRICING} per month</strong>.
          </div>
        ) : (
          <div>
            This feature is available as part of GitHub SSO for Teams and is
            included in your current plan.
          </div>
        )}
        {team.ssoGithubAccount ? (
          <DisableButton teamAccountId={team.id} />
        ) : (
          <ConfigureGitHubSSO
            teamAccountId={team.id}
            priced={priced}
            disabledReason={
              !hasActiveSubscription
                ? "You must have an active subscription to enable GitHub SSO."
                : priced && !usageBased
                  ? "This feature is not available on your current plan, please contact us."
                  : undefined
            }
          />
        )}
      </CardFooter>
    </Card>
  );
}
