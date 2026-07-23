import { memo } from "react";
import { useMutation } from "@apollo/client/react";
import { MarkGithubIcon } from "@primer/octicons-react";

import { GITHUB_SSO_PRICING } from "@/constants";
import { GithubAccountLink } from "@/containers/GithubAccountLink";
import { DocumentType, graphql } from "@/gql";
import { TeamGitHubSso_TeamFragment } from "@/gql/graphql";
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
  DialogActionButton,
  DialogBody,
  DialogDismiss,
  DialogFooter,
  DialogText,
  DialogTitle,
  DialogTrigger,
} from "@/ui/Dialog";
import { ErrorMessage } from "@/ui/ErrorMessage";
import { Modal } from "@/ui/Modal";
import { getErrorMessage } from "@/util/error";
import { getAddOnBlockedReason } from "@/util/subscription";

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
    subscription {
      id
      provider
    }
    ssoGithubAccount {
      id
      ...GithubAccountLink_GithubAccount
    }
    ...AddOnsPricingTable_Team
  }
`);

const DisableGitHubSSOMutation = graphql(`
  mutation ConfigureGitHubSSO_disableGitHubSSOOnTeam($teamAccountId: ID!) {
    disableGitHubSSOOnTeam(input: { teamAccountId: $teamAccountId }) {
      ...TeamGitHubSSO_Team
    }
  }
`);

export const DisableGitHubSSOButton = memo(
  function DisableGitHubSSOButton(props: { teamAccountId: string }) {
    const [disable, { error }] = useMutation(DisableGitHubSSOMutation, {
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
          <Dialog role="alertdialog">
            <DialogBody>
              <DialogTitle>Disable GitHub Single Sign-On</DialogTitle>
              <DialogText>
                Team members will no longer be synchronized from your GitHub
                organization.
              </DialogText>
            </DialogBody>
            <DialogFooter>
              {error && <ErrorMessage>{getErrorMessage(error)}</ErrorMessage>}
              <DialogDismiss>Cancel</DialogDismiss>
              <DialogActionButton
                onAction={async () => {
                  await disable().catch(() => {});
                }}
              >
                Disable
              </DialogActionButton>
            </DialogFooter>
          </Dialog>
        </Modal>
      </DialogTrigger>
    );
  },
);

export function TeamGitHubSSO(props: {
  team: DocumentType<typeof _TeamFragment>;
}) {
  const { team } = props;
  const priced = !team.plan?.githubSsoIncluded;
  const disabledReason = getAddOnBlockedReason({
    status: team.subscriptionStatus,
    provider: team.subscription?.provider,
    includedInPlan: !priced,
    usageBased: Boolean(team.plan?.usageBased),
    featureName: "GitHub SSO",
  });
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
          <DisableGitHubSSOButton teamAccountId={team.id} />
        ) : (
          <ConfigureGitHubSSO
            team={team}
            priced={priced}
            disabledReason={disabledReason ?? undefined}
          />
        )}
      </CardFooter>
    </Card>
  );
}
