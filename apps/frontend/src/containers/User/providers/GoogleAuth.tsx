import { useApolloClient } from "@apollo/client/react";
import { ExternalLinkIcon } from "lucide-react";

import { GoogleLoginButton, GoogleLogo } from "@/containers/Google";
import { DocumentType, graphql } from "@/gql";
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
  fragment GoogleAuth_Account on User {
    id
    googleUser {
      id
      name
      primaryEmail
      lastLoggedAt
    }
  }
`);

const DisconnectGoogleMutation = graphql(`
  mutation GoogleAuth_disconnectGoogleAuth($accountId: ID!) {
    disconnectGoogleAuth(input: { accountId: $accountId }) {
      ...GoogleAuth_Account
    }
  }
`);

export function GoogleAuth(props: {
  account: DocumentType<typeof _AccountFragment>;
}) {
  const { account } = props;
  const client = useApolloClient();
  const disconnect = () =>
    client.mutate({
      mutation: DisconnectGoogleMutation,
      variables: {
        accountId: account.id,
      },
      optimisticResponse: {
        disconnectGoogleAuth: {
          __typename: "User",
          id: account.id,
          googleUser: null,
        },
      },
    });
  return (
    <ProviderCard>
      {account.googleUser ? (
        <>
          <ProviderIcon>
            <GoogleLogo />
          </ProviderIcon>
          <ProviderContent>
            <div className="font-medium">Google</div>
            <div>
              {account.googleUser.name && account.googleUser.primaryEmail ? (
                <>
                  {account.googleUser.name} ({account.googleUser.primaryEmail})
                </>
              ) : account.googleUser.primaryEmail ? (
                account.googleUser.primaryEmail
              ) : (
                "Connected"
              )}
            </div>
          </ProviderContent>
          {account.googleUser.lastLoggedAt && (
            <ProviderLastLoggedAt date={account.googleUser.lastLoggedAt} />
          )}
          <MenuRoot>
            <MenuTrigger>
              <ProviderMenuButton />
            </MenuTrigger>
            <Menu aria-label="Google options">
              <MenuItem
                icon={<ExternalLinkIcon />}
                href="https://myaccount.google.com/connections"
                target="_blank"
              >
                Manage on google.com
              </MenuItem>
              {getReconnectGoogleMenuItem()}
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
        <GoogleLoginButton>Connect Google</GoogleLoginButton>
      )}
    </ProviderCard>
  );
}

/** A function, not a component: a menu cannot see inside one. */
function getReconnectGoogleMenuItem() {
  const url = getOAuthURL({
    provider: "google",
    redirect: null,
  });
  return (
    <MenuItem href={url} target="_blank">
      Re-authenticate Google
    </MenuItem>
  );
}
