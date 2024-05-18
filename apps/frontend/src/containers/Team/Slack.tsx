import { useMutation } from "@apollo/client";

import { DocumentType, FragmentType, graphql, useFragment } from "@/gql";
import { AccountPermission, TeamSlack_AccountFragment } from "@/gql/graphql";
import { useAccountContext } from "@/pages/Account";
import { Anchor } from "@/ui/Anchor";
import { Button, ButtonIcon } from "@/ui/Button";
import {
  Card,
  CardBody,
  CardFooter,
  CardParagraph,
  CardTitle,
} from "@/ui/Card";
import { Time } from "@/ui/Time";

import { SlackColoredLogo } from "../Slack";

const AccountFragment = graphql(`
  fragment TeamSlack_Account on Account {
    id
    slackInstallation {
      id
      createdAt
      teamName
      teamDomain
    }
  }
`);

export function TeamSlack(props: {
  account: FragmentType<typeof AccountFragment>;
}) {
  const account = useFragment(AccountFragment, props.account);
  const { permissions } = useAccountContext();
  const hasAdminPermission = permissions.includes(AccountPermission.Admin);
  return (
    <Card>
      <CardBody>
        <CardTitle id="slack">Slack</CardTitle>
        <CardParagraph>
          Set up Slack to receive build notifications and view detailed link
          previews.
        </CardParagraph>
        {account.slackInstallation && (
          <Card className="flex justify-between p-4">
            <div className="flex items-center gap-2 font-semibold">
              <SlackColoredLogo className="size-6" />{" "}
              <Anchor
                href={`https://${account.slackInstallation.teamDomain}.slack.com`}
                external
                className="!text"
              >
                {account.slackInstallation.teamName}
              </Anchor>
            </div>
            <div className="text-low text-sm">
              Connected <Time date={account.slackInstallation.createdAt} />
            </div>
          </Card>
        )}
      </CardBody>
      <CardFooter className="flex items-center justify-between">
        <div>
          Learn more about{" "}
          <Anchor href="https://argos-ci.com/docs/slack" external>
            Slack integration
          </Anchor>
          .
        </div>
        {hasAdminPermission ? (
          account.slackInstallation ? (
            <DisconnectSlackButton account={account} />
          ) : (
            <Button color="google" asChild>
              <a href={`/auth/slack/login?accountId=${account.id}`}>
                <ButtonIcon>
                  <SlackColoredLogo />
                </ButtonIcon>
                Connect to Slack
              </a>
            </Button>
          )
        ) : null}
      </CardFooter>
    </Card>
  );
}

const UninstallSlackMutation = graphql(`
  mutation AccountSlack_UninstallSlack($accountId: ID!) {
    uninstallSlack(input: { accountId: $accountId }) {
      id
      ...TeamSlack_Account
    }
  }
`);

function DisconnectSlackButton(props: {
  account: DocumentType<typeof AccountFragment>;
}) {
  const [uninstallSlack] = useMutation(UninstallSlackMutation, {
    variables: { accountId: props.account.id },
    optimisticResponse: {
      uninstallSlack: {
        ...props.account,
        slackInstallation: null,
      } as TeamSlack_AccountFragment,
    },
  });

  return (
    <Button
      color="neutral"
      variant="outline"
      onClick={() => {
        uninstallSlack();
      }}
    >
      Disconnect
    </Button>
  );
}
