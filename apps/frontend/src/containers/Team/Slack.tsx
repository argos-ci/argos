import { useApolloClient } from "@apollo/client/react";
import {
  ExternalLinkIcon,
  MoreVerticalIcon,
  TriangleAlertIcon,
} from "lucide-react";

import { DocumentType, graphql } from "@/gql";
import { AccountPermission, TeamSlack_AccountFragment } from "@/gql/graphql";
import { useAccountContext } from "@/pages/Account";
import { Button } from "@/ui/Button";
import {
  Card,
  CardBody,
  CardFooter,
  CardParagraph,
  CardTitle,
} from "@/ui/Card";
import { Link } from "@/ui/Link";
import {
  Menu,
  MenuItem,
  MenuItemTooltip,
  MenuRoot,
  MenuTrigger,
} from "@/ui/menu-kit";
import { Time } from "@/ui/Time";
import { getSlackAuthURL } from "@/util/slack";

import {
  SLACK_OWNER_ONLY_REASON,
  SlackColoredLogo,
  SlackInstallButton,
  SlackOwnerOnlyTooltip,
} from "../Slack";

const _AccountFragment = graphql(`
  fragment TeamSlack_Account on Account {
    id
    slackInstallation {
      id
      connectedAt
      teamName
      teamDomain
      isUpToDate
    }
  }
`);

export function TeamSlack(props: {
  account: DocumentType<typeof _AccountFragment>;
}) {
  const { account } = props;
  const { permissions } = useAccountContext();
  const hasAdminPermission = permissions.includes(AccountPermission.Admin);
  const client = useApolloClient();
  const uninstallSlack = () =>
    client.mutate({
      mutation: UninstallSlackMutation,
      variables: { accountId: props.account.id },
      optimisticResponse: {
        uninstallSlack: {
          ...props.account,
          slackInstallation: null,
        } as TeamSlack_AccountFragment,
      },
    });
  const authURL = getSlackAuthURL({ accountId: props.account.id });
  const ownerOnlySuffix = hasAdminPermission ? null : (
    <MenuItemTooltip content={SLACK_OWNER_ONLY_REASON} />
  );
  return (
    <Card id="slack">
      <CardBody>
        <CardTitle>Slack</CardTitle>
        <CardParagraph>
          Connect Slack to receive build notifications and access detailed link
          previews when sharing build URLs.
        </CardParagraph>
        {account.slackInstallation && (
          <Card className="flex items-center gap-3 p-4">
            <SlackColoredLogo className="size-6 shrink-0" />
            <div className="min-w-0 flex-1">
              <div className="truncate font-semibold">
                <Link
                  className="!text"
                  href={`https://${account.slackInstallation.teamDomain}.slack.com`}
                  target="_blank"
                >
                  {account.slackInstallation.teamName}
                </Link>
              </div>
              <div className="text-low text-sm">
                Connected <Time date={account.slackInstallation.connectedAt} />
              </div>
            </div>
            <MenuRoot>
              <MenuTrigger>
                <Button variant="ghost" iconOnly className="shrink-0">
                  <MoreVerticalIcon />
                </Button>
              </MenuTrigger>
              <Menu aria-label="Slack options">
                <MenuItem
                  icon={<ExternalLinkIcon />}
                  href={`https://${account.slackInstallation.teamDomain}.slack.com/apps/manage`}
                  target="_blank"
                >
                  Manage on Slack
                </MenuItem>
                <MenuItem
                  // A link row still navigates when disabled.
                  href={hasAdminPermission ? authURL : undefined}
                  target="_blank"
                  disabled={!hasAdminPermission}
                  suffix={ownerOnlySuffix}
                >
                  Re-connect Slack
                </MenuItem>
                <MenuItem
                  variant="danger"
                  disabled={!hasAdminPermission}
                  suffix={ownerOnlySuffix}
                  onAction={() => {
                    uninstallSlack().catch(() => {});
                  }}
                >
                  Disconnect
                </MenuItem>
              </Menu>
            </MenuRoot>
          </Card>
        )}
        {account.slackInstallation && !account.slackInstallation.isUpToDate ? (
          <Card className="mt-4 flex items-center justify-between gap-4 p-4">
            <div>
              <div className="text-warning-low mb-1 flex items-center gap-2 font-semibold">
                <TriangleAlertIcon className="inline size-4" /> Action Required
              </div>
              <p className="text-sm">
                {hasAdminPermission
                  ? "Slack permissions need an update, please reconnect."
                  : "Slack permissions need an update, ask a team owner to reconnect."}
              </p>
            </div>
            <SlackInstallButton
              accountId={account.id}
              hasAdminPermission={hasAdminPermission}
              target="_blank"
            >
              Reconnect
            </SlackInstallButton>
          </Card>
        ) : null}
      </CardBody>
      <CardFooter className="flex items-center justify-between gap-4">
        <p>
          Learn more about{" "}
          <Link
            href="https://argos-ci.com/docs/learn/integrations/slack-integration"
            target="_blank"
          >
            Slack notifications
          </Link>
        </p>
        {account.slackInstallation ? (
          hasAdminPermission ? (
            <Button
              variant="secondary"
              onClick={() => {
                uninstallSlack().catch(() => {});
              }}
            >
              Disconnect
            </Button>
          ) : (
            <SlackOwnerOnlyTooltip>
              <Button variant="secondary" disabled>
                Disconnect
              </Button>
            </SlackOwnerOnlyTooltip>
          )
        ) : (
          <SlackInstallButton
            accountId={account.id}
            hasAdminPermission={hasAdminPermission}
            target="_parent"
          >
            Connect to Slack
          </SlackInstallButton>
        )}
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
