import { useApolloClient } from "@apollo/client/react";
import { MarkGithubIcon } from "@primer/octicons-react";
import { ExternalLinkIcon } from "lucide-react";

import { config } from "@/config";
import { GitHubLoginButton } from "@/containers/GitHub";
import { DocumentType, graphql } from "@/gql";
import { GitHubAuth_AccountFragment } from "@/gql/graphql";
import { Link } from "@/ui/Link";
import { Menu, MenuItem, MenuRoot, MenuTrigger } from "@/ui/menu-kit";
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
  const client = useApolloClient();
  const disconnect = () =>
    client.mutate({
      mutation: DisconnectGitHubMutation,
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
          <MenuRoot>
            <MenuTrigger>
              <ProviderMenuButton />
            </MenuTrigger>
            <Menu aria-label="GitHub options">
              <MenuItem
                icon={<ExternalLinkIcon />}
                href={`https://github.com/settings/connections/applications/${config.github.clientId}`}
                target="_blank"
              >
                Manage on github.com
              </MenuItem>
              {getReconnectGitHubMenuItem()}
              <MenuItem
                variant="danger"
                onAction={() => {
                  disconnect();
                }}
              >
                Disconnect
              </MenuItem>
            </Menu>
          </MenuRoot>
        </>
      ) : (
        <GitHubLoginButton>Connect GitHub</GitHubLoginButton>
      )}
    </ProviderCard>
  );
}

/** A function, not a component: a menu cannot see inside one. */
function getReconnectGitHubMenuItem() {
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
