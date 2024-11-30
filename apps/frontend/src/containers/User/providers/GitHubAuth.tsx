import { useMutation } from "@apollo/client";
import { MarkGithubIcon } from "@primer/octicons-react";
import { MenuTrigger } from "react-aria-components";

import { GitHubLoginButton } from "@/containers/GitHub";
import { FragmentType, graphql, useFragment } from "@/gql";
import { GitHubAuth_AccountFragment } from "@/gql/graphql";
import { Link } from "@/ui/Link";
import { Menu, MenuItem } from "@/ui/Menu";
import { Popover } from "@/ui/Popover";
import { useOAuthURL } from "@/util/oauth";

import {
  ProviderCard,
  ProviderContent,
  ProviderIcon,
  ProviderMenuButton,
} from "../ui";

const AccountFragment = graphql(`
  fragment GitHubAuth_Account on Account {
    id
    githubAccount {
      id
      login
      name
      url
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
  account: FragmentType<typeof AccountFragment>;
}) {
  const account = useFragment(AccountFragment, props.account);
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
            <div>GitHub</div>
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
          <MenuTrigger>
            <ProviderMenuButton />
            <Popover>
              <Menu aria-label="GitHub options">
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
  const url = useOAuthURL({
    provider: "github",
    redirect: null,
  });
  return (
    <MenuItem href={url} target="_blank">
      Re-authenticate GitHub
    </MenuItem>
  );
}
