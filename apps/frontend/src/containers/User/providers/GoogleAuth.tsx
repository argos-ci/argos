import { useMutation } from "@apollo/client";
import { ExternalLinkIcon } from "lucide-react";
import { MenuTrigger } from "react-aria-components";

import { GoogleLoginButton, GoogleLogo } from "@/containers/Google";
import { DocumentType, graphql } from "@/gql";
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
  const [disconnect] = useMutation(DisconnectGoogleMutation, {
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
          <MenuTrigger>
            <ProviderMenuButton />
            <Popover>
              <Menu aria-label="Google options">
                <MenuItem
                  href="https://myaccount.google.com/connections"
                  target="_blank"
                >
                  Manage on google.com
                  <MenuItemIcon position="right">
                    <ExternalLinkIcon />
                  </MenuItemIcon>
                </MenuItem>
                <ReconnectGoogleMenuItem />
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
        <GoogleLoginButton>Connect Google</GoogleLoginButton>
      )}
    </ProviderCard>
  );
}

function ReconnectGoogleMenuItem() {
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
