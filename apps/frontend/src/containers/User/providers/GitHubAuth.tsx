import { useMutation } from "@apollo/client";
import { MarkGithubIcon } from "@primer/octicons-react";
import { ExternalLinkIcon } from "lucide-react";
import { MenuTrigger } from "react-aria-components";

import { config } from "@/config";
import { GitHubLoginButton } from "@/containers/GitHub";
import { DocumentType, graphql } from "@/gql";
import { GitHubAuth_AccountFragment } from "@/gql/graphql";
import { Link } from "@/ui/Link";
import { Menu, MenuItem, MenuItemIcon } from "@/ui/Menu";
import { Popover } from "@/ui/Popover";
import { getOAuthURL } from "@/util/oauth";

import {
  ProviderCard,
  ProviderContent,
  ProviderIcon,
  ProviderLastLoggedAt,
  ProviderMenuButton,
} from "../ui";

const _AccountFragment = graphql(`
  fragment GitHubAuth_Account on Account {
    id
    githubAccount {
      id
      login
      name
      url
      lastLoggedAt
    }
  }
`);

const DisconnectGitHubMutation = graphql(`
  mutation GitHubAuth_disconnectGitHubAuth($accountId: ID!) {
    disconnectGitHubAuth(input: { accountId: $accountId }) {
      ...GitHubAuth_Account
    }
  }
`);

export function GitHubAuth(props: {
  account: DocumentType<typeof _AccountFragment>;
}) {
  const { account } = props;
  const [disconnect] = useMutation(DisconnectGitHubMutation, {
    variables: {
      accountId: account.id,
    },
    optimisticResponse: {
      disconnectGitHubAuth: {
        __typename: "User",
        id: account.id,
        githubAccount: null,
      } as GitHubAuth_AccountFragment,
    },
  });
  return (
    <ProviderCard>
      {account.githubAccount ? (
        <>
          <ProviderIcon>
            <MarkGithubIcon />
          </ProviderIcon>
          <ProviderContent>
            <div className="font-medium">GitHub</div>
            <div>
              {account.githubAccount.name} (
              <Link
                external={false}
                href={account.githubAccount.url}
                target="_blank"
              >
                @{account.githubAccount.login}
              </Link>
              )
            </div>
          </ProviderContent>
          {account.githubAccount.lastLoggedAt && (
            <ProviderLastLoggedAt date={account.githubAccount.lastLoggedAt} />
          )}
          <MenuTrigger>
            <ProviderMenuButton />
            <Popover>
              <Menu aria-label="GitHub options">
                <MenuItem
                  href={`https://github.com/settings/connections/applications/${config.github.clientId}`}
                  target="_blank"
                >
                  Manage on github.com
                  <MenuItemIcon position="right">
                    <ExternalLinkIcon />
                  </MenuItemIcon>
                </MenuItem>
                <ReconnectGitHubMenuItem />
                <MenuItem
                  variant="danger"
                  onAction={() => {
                    disconnect();
                  }}
                >
                  Disconnect
                </MenuItem>
              </Menu>
            </Popover>
          </MenuTrigger>
        </>
      ) : (
        <GitHubLoginButton>Connect GitHub</GitHubLoginButton>
      )}
    </ProviderCard>
  );
}

function ReconnectGitHubMenuItem() {
  const url = getOAuthURL({
    provider: "github",
    redirect: null,
  });
  return (
    <MenuItem href={url} target="_blank">
      Re-authenticate GitHub
    </MenuItem>
  );
}
