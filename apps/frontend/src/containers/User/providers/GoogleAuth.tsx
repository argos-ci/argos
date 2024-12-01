import { useMutation } from "@apollo/client";
import { MenuTrigger } from "react-aria-components";

import { GoogleLoginButton, GoogleLogo } from "@/containers/Google";
import { FragmentType, graphql, useFragment } from "@/gql";
import { GoogleAuth_AccountFragment } from "@/gql/graphql";
import { Menu, MenuItem } from "@/ui/Menu";
import { Popover } from "@/ui/Popover";
import { getOAuthURL } from "@/util/oauth";

import {
  ProviderCard,
  ProviderContent,
  ProviderIcon,
  ProviderMenuButton,
} from "../ui";

const AccountFragment = graphql(`
  fragment GoogleAuth_Account on User {
    id
    googleUserId
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
  account: FragmentType<typeof AccountFragment>;
}) {
  const account = useFragment(AccountFragment, props.account);
  const [disconnect] = useMutation(DisconnectGoogleMutation, {
    variables: {
      accountId: account.id,
    },
    optimisticResponse: {
      disconnectGoogleAuth: {
        __typename: "User",
        id: account.id,
        googleUserId: null,
      } as GoogleAuth_AccountFragment,
    },
  });
  return (
    <ProviderCard>
      {account.googleUserId ? (
        <>
          <ProviderIcon>
            <GoogleLogo />
          </ProviderIcon>
          <ProviderContent>
            <div>Google</div>
            <div>Connected</div>
          </ProviderContent>
          <MenuTrigger>
            <ProviderMenuButton />
            <Popover>
              <Menu aria-label="Google options">
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
