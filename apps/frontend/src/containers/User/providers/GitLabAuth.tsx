import { useApolloClient } from "@apollo/client/react";
import { ExternalLinkIcon } from "lucide-react";

import { GitLabColoredLogo, GitLabLoginButton } from "@/containers/GitLab";
import { DocumentType, graphql } from "@/gql";
import { GitLabAuth_AccountFragment } from "@/gql/graphql";
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
  fragment GitLabAuth_Account on User {
    id
    gitlabUser {
      id
      username
      name
      url
      lastLoggedAt
    }
  }
`);

const DisconnectGitLabMutation = graphql(`
  mutation GitLabAuth_disconnectGitLabAuth($accountId: ID!) {
    disconnectGitLabAuth(input: { accountId: $accountId }) {
      ...GitLabAuth_Account
    }
  }
`);

export function GitLabAuth(props: {
  account: DocumentType<typeof _AccountFragment>;
}) {
  const { account } = props;
  const client = useApolloClient();
  const disconnect = () =>
    client.mutate({
      mutation: DisconnectGitLabMutation,
      variables: {
        accountId: account.id,
      },
      optimisticResponse: {
        disconnectGitLabAuth: {
          __typename: "User",
          id: account.id,
          gitlabUser: null,
        } as GitLabAuth_AccountFragment,
      },
    });
  return (
    <ProviderCard>
      {account.gitlabUser ? (
        <>
          <ProviderIcon>
            <GitLabColoredLogo />
          </ProviderIcon>
          <ProviderContent>
            <div className="font-medium">GitLab</div>
            <div>
              {account.gitlabUser.name} (
              <Link
                external={false}
                href={account.gitlabUser.url}
                target="_blank"
              >
                @{account.gitlabUser.username}
              </Link>
              )
            </div>
          </ProviderContent>
          {account.gitlabUser.lastLoggedAt && (
            <ProviderLastLoggedAt date={account.gitlabUser.lastLoggedAt} />
          )}
          <MenuRoot>
            <MenuTrigger>
              <ProviderMenuButton />
            </MenuTrigger>
            <Menu aria-label="GitLab options">
              <MenuItem
                icon={<ExternalLinkIcon />}
                href="https://gitlab.com/-/profile/applications"
                target="_blank"
              >
                Manage on gitlab.com
              </MenuItem>
              {getReconnectGitLabMenuItem()}
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
        <GitLabLoginButton>Connect GitLab</GitLabLoginButton>
      )}
    </ProviderCard>
  );
}

/** A function, not a component: a menu cannot see inside one. */
function getReconnectGitLabMenuItem() {
  const url = getOAuthURL({
    provider: "gitlab",
    redirect: null,
  });
  return (
    <MenuItem href={url} target="_blank">
      Re-authenticate GitLab
    </MenuItem>
  );
}
