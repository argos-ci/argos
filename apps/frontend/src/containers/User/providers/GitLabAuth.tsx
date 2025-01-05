import { useMutation } from "@apollo/client";
import { ExternalLinkIcon } from "lucide-react";
import { MenuTrigger } from "react-aria-components";

import { GitLabColoredLogo, GitLabLoginButton } from "@/containers/GitLab";
import { DocumentType, graphql } from "@/gql";
import { GitLabAuth_AccountFragment } from "@/gql/graphql";
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
  const [disconnect] = useMutation(DisconnectGitLabMutation, {
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
          <MenuTrigger>
            <ProviderMenuButton />
            <Popover>
              <Menu aria-label="GitLab options">
                <MenuItem
                  href="https://gitlab.com/-/profile/applications"
                  target="_blank"
                >
                  Manage on gitlab.com
                  <MenuItemIcon position="right">
                    <ExternalLinkIcon />
                  </MenuItemIcon>
                </MenuItem>
                <ReconnectGitLabMenuItem />
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
        <GitLabLoginButton>Connect GitLab</GitLabLoginButton>
      )}
    </ProviderCard>
  );
}

function ReconnectGitLabMenuItem() {
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
