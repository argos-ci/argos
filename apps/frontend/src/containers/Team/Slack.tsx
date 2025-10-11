import { useMutation } from "@apollo/client/react";
import {
  ExternalLinkIcon,
  MoreVerticalIcon,
  TriangleAlertIcon,
} from "lucide-react";
import { MenuTrigger } from "react-aria-components";

import { DocumentType, graphql } from "@/gql";
import { AccountPermission, TeamSlack_AccountFragment } from "@/gql/graphql";
import { useAccountContext } from "@/pages/Account";
import { Button, ButtonIcon, LinkButton } from "@/ui/Button";
import {
  Card,
  CardBody,
  CardFooter,
  CardParagraph,
  CardTitle,
} from "@/ui/Card";
import { IconButton } from "@/ui/IconButton";
import { Link } from "@/ui/Link";
import { Menu, MenuItem, MenuItemIcon } from "@/ui/Menu";
import { Popover } from "@/ui/Popover";
import { Time } from "@/ui/Time";
import { getSlackAuthURL } from "@/util/slack";

import { SlackColoredLogo } from "../Slack";

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
  const [uninstallSlack] = useMutation(UninstallSlackMutation, {
    variables: { accountId: props.account.id },
    optimisticResponse: {
      uninstallSlack: {
        ...props.account,
        slackInstallation: null,
      } as TeamSlack_AccountFragment,
    },
  });
  const authURL = getSlackAuthURL({ accountId: props.account.id });
  return (
    <Card id="slack">
      <CardBody>
        <CardTitle>Slack</CardTitle>
        <CardParagraph>
          Connect Slack to receive build notifications and access detailed link
          previews when sharing build URLs.
        </CardParagraph>
        {account.slackInstallation && (
          <Card className="flex justify-between p-4">
            <div className="flex items-center gap-2 font-semibold">
              <SlackColoredLogo className="size-6" />{" "}
              <Link
                className="!text"
                href={`https://${account.slackInstallation.teamDomain}.slack.com`}
                target="_blank"
              >
                {account.slackInstallation.teamName}
              </Link>
            </div>
            <div className="flex items-center gap-2">
              <div className="text-low text-sm">
                Connected <Time date={account.slackInstallation.connectedAt} />
              </div>
              <MenuTrigger>
                <IconButton className="shrink-0">
                  <MoreVerticalIcon />
                </IconButton>
                <Popover>
                  <Menu aria-label="Slack options">
                    <MenuItem
                      href={`https://${account.slackInstallation.teamDomain}.slack.com/apps/manage`}
                      target="_blank"
                    >
                      Manage on Slack
                      <MenuItemIcon position="right">
                        <ExternalLinkIcon />
                      </MenuItemIcon>
                    </MenuItem>
                    <MenuItem href={authURL} target="_blank">
                      Re-connect Slack
                    </MenuItem>
                    <MenuItem
                      variant="danger"
                      onAction={() => {
                        uninstallSlack().catch(() => {});
                      }}
                    >
                      Disconnect
                    </MenuItem>
                  </Menu>
                </Popover>
              </MenuTrigger>
            </div>
          </Card>
        )}
        {account.slackInstallation && !account.slackInstallation.isUpToDate ? (
          <Card className="mt-4 flex items-center justify-between gap-4 p-4">
            <div>
              <div className="text-warning-low mb-1 flex items-center gap-2 font-semibold">
                <TriangleAlertIcon className="inline size-4" /> Action Required
              </div>
              <p className="text-sm">
                Slack permissions need an update, please reconnect.
              </p>
            </div>
            <LinkButton target="_blank" href={authURL} variant="google">
              <ButtonIcon>
                <SlackColoredLogo />
              </ButtonIcon>
              Reconnect
            </LinkButton>
          </Card>
        ) : null}
      </CardBody>
      <CardFooter className="flex items-center justify-between gap-4">
        <p>
          Learn more about{" "}
          <Link
            href="https://argos-ci.com/docs/slack-notifications"
            target="_blank"
          >
            Slack notifications
          </Link>
        </p>
        {hasAdminPermission ? (
          account.slackInstallation ? (
            <Button
              variant="secondary"
              onPress={() => {
                uninstallSlack().catch(() => {});
              }}
            >
              Disconnect
            </Button>
          ) : (
            <LinkButton variant="google" target="_parent" href={authURL}>
              <ButtonIcon>
                <SlackColoredLogo />
              </ButtonIcon>
              Connect to Slack
            </LinkButton>
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
