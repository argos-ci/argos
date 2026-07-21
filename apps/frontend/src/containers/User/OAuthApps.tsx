import { useMutation } from "@apollo/client/react";
import { invariant } from "@argos/util/invariant";
import { clsx } from "clsx";
import { Trash2Icon } from "lucide-react";
import { MenuTrigger } from "react-aria-components";

import { AccountAvatar } from "@/containers/AccountAvatar";
import { OAuthAppLogo, VerifiedBadge } from "@/containers/OAuthAppLogo";
import { ProviderMenuButton } from "@/containers/User/ui";
import { DocumentType, graphql } from "@/gql";
import { Card, CardBody, CardParagraph, CardTitle } from "@/ui/Card";
import {
  Dialog,
  DialogActionButton,
  DialogBody,
  DialogDismiss,
  DialogFooter,
  DialogText,
  DialogTitle,
  useDialogValueState,
  useOverlayTriggerState,
} from "@/ui/Dialog";
import { ErrorMessage } from "@/ui/ErrorMessage";
import { List, ListEmpty, ListHeaderRow, ListRow } from "@/ui/List";
import { Menu, MenuItem, MenuItemIcon } from "@/ui/Menu";
import { Modal } from "@/ui/Modal";
import { Popover } from "@/ui/Popover";
import { Time } from "@/ui/Time";
import { toast } from "@/ui/Toaster";

import { formatList } from "../../util/intl";

const _AccountFragment = graphql(`
  fragment OAuthApps_Account on User {
    id
    authorizedApps {
      id
      createdAt
      lastUsedAt
      scopes
      client {
        id
        name
        verified
        knownAppId
      }
      accounts {
        id
        name
        slug
        avatar {
          ...AccountAvatarFragment
        }
      }
    }
  }
`);

const RevokeOAuthGrantMutation = graphql(`
  mutation OAuthApps_RevokeOAuthGrant($input: RevokeOAuthGrantInput!) {
    revokeOAuthGrant(input: $input) {
      id
    }
  }
`);

type AuthorizedApp = DocumentType<
  typeof _AccountFragment
>["authorizedApps"][number];

type RevokeValue = { id: string; name: string };

function RevokeAppDialog(props: {
  accountId: string;
  id: string;
  name: string;
}) {
  const { accountId, id, name } = props;
  const state = useOverlayTriggerState();
  const [revoke, { error }] = useMutation(RevokeOAuthGrantMutation, {
    variables: { input: { id } },
    update(cache) {
      const userId = cache.identify({ __typename: "User", id: accountId });
      if (!userId) {
        return;
      }
      cache.modify({
        id: userId,
        fields: {
          authorizedApps(existing = [], { readField }) {
            return existing.filter(
              (ref: Parameters<typeof readField>[1]) =>
                readField("id", ref) !== id,
            );
          },
        },
      });
    },
  });

  return (
    <Dialog size="medium" role="alertdialog">
      <DialogBody>
        <DialogTitle>Revoke access</DialogTitle>
        <DialogText>
          <strong>{name}</strong> will immediately lose access to your account
          and its access tokens will stop working. This cannot be undone.
        </DialogText>
      </DialogBody>
      <DialogFooter>
        {error && (
          <ErrorMessage className="flex-1">{error.message}</ErrorMessage>
        )}
        <DialogDismiss>Cancel</DialogDismiss>
        <DialogActionButton
          variant="destructive"
          onAction={async () => {
            try {
              await revoke();
              state.close();
              toast.success("Access revoked");
            } catch {
              // Surfaced via the mutation's `error` state above.
            }
          }}
        >
          Revoke access
        </DialogActionButton>
      </DialogFooter>
    </Dialog>
  );
}

function AppActionsMenu(props: {
  app: AuthorizedApp;
  onRevoke: (value: RevokeValue) => void;
}) {
  const { app, onRevoke } = props;
  return (
    <MenuTrigger>
      <ProviderMenuButton />
      <Popover>
        <Menu aria-label={`${app.client.name} options`}>
          <MenuItem
            variant="danger"
            onAction={() => onRevoke({ id: app.id, name: app.client.name })}
          >
            <MenuItemIcon>
              <Trash2Icon />
            </MenuItemIcon>
            Revoke access
          </MenuItem>
        </Menu>
      </Popover>
    </MenuTrigger>
  );
}

function OAuthAppList(props: {
  apps: readonly AuthorizedApp[];
  onRevoke: (value: RevokeValue) => void;
}) {
  const { apps, onRevoke } = props;
  const columns = "grid-cols-[3fr_2fr_2fr_1fr_2rem]";
  return (
    <List className="min-w-160 rounded-none">
      <ListHeaderRow className={clsx("grid items-center gap-x-6", columns)}>
        <div className="min-w-0">Application</div>
        <div className="min-w-0">Permissions</div>
        <div className="min-w-0">Organizations</div>
        <div className="min-w-0">Last used</div>
        <div />
      </ListHeaderRow>
      {apps.map((app) => (
        <ListRow
          key={app.id}
          className={clsx(
            "grid items-center gap-x-6 gap-y-0 px-4 py-2 text-sm",
            columns,
          )}
        >
          <div className="flex min-w-0 items-center gap-3">
            <OAuthAppLogo
              name={app.client.name}
              knownAppId={app.client.knownAppId}
            />
            <div className="min-w-0">
              <div className="flex items-center gap-1.5">
                <span className="truncate font-medium">{app.client.name}</span>
                {app.client.verified && <VerifiedBadge scale="xs" />}
              </div>
              <div className="text-low mt-0.5 text-xs">
                Authorized <Time date={app.createdAt} />
              </div>
            </div>
          </div>
          <div className="text-low min-w-0 text-xs">
            {formatList(app.scopes)}
          </div>
          <div className="flex min-w-0 flex-wrap items-center gap-x-3 gap-y-2">
            {app.accounts.map((account) => (
              <span
                key={account.id}
                className="flex items-center gap-1 text-xs"
              >
                <AccountAvatar avatar={account.avatar} className="size-4" />
                <span className="truncate">{account.name ?? account.slug}</span>
              </span>
            ))}
          </div>
          <div
            className="text-low min-w-0 truncate text-xs whitespace-nowrap"
            data-visual-test="transparent"
          >
            {app.lastUsedAt ? <Time date={app.lastUsedAt} /> : "-"}
          </div>
          <div>
            <AppActionsMenu app={app} onRevoke={onRevoke} />
          </div>
        </ListRow>
      ))}
    </List>
  );
}

export function OAuthApps(props: {
  account: DocumentType<typeof _AccountFragment>;
}) {
  const { account } = props;
  invariant(account.__typename === "User");
  const revoking = useDialogValueState<RevokeValue | null>(null);

  return (
    <Card>
      <CardBody>
        <CardTitle>Authorized applications</CardTitle>
        <CardParagraph>
          These applications can access your Argos account on your behalf.
          Revoke any you no longer use.
        </CardParagraph>
        <div className="mt-2 flex flex-col gap-2 overflow-auto">
          {account.authorizedApps.length > 0 ? (
            <OAuthAppList
              apps={account.authorizedApps}
              onRevoke={(value) => revoking.open(value)}
            />
          ) : (
            <ListEmpty>You haven’t authorized any applications yet.</ListEmpty>
          )}
        </div>
      </CardBody>

      {revoking.value ? (
        <Modal isOpen={revoking.isOpen} onOpenChange={revoking.onOpenChange}>
          <RevokeAppDialog
            accountId={account.id}
            id={revoking.value.id}
            name={revoking.value.name}
          />
        </Modal>
      ) : null}
    </Card>
  );
}
