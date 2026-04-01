import { invariant } from "@argos/util/invariant";
import clsx from "clsx";
import { PencilIcon, PlusIcon, Trash2Icon } from "lucide-react";
import { DialogTrigger, MenuTrigger } from "react-aria-components";

import { ProviderMenuButton } from "@/containers/User/ui";
import { DocumentType, graphql } from "@/gql";
import { Button, ButtonIcon } from "@/ui/Button";
import { Card, CardBody, CardParagraph, CardTitle } from "@/ui/Card";
import { useDialogValueState } from "@/ui/Dialog";
import { List, ListHeaderRow, ListRow } from "@/ui/List";
import { Menu, MenuItem, MenuItemIcon } from "@/ui/Menu";
import { Modal } from "@/ui/Modal";
import { Popover } from "@/ui/Popover";
import { Time } from "@/ui/Time";

import { formatList } from "../../util/intl";
import { CreateTokenDialog } from "./tokens/CreateTokenDialog";
import { DeleteTokenDialog } from "./tokens/DeleteTokenDialog";
import { EditTokenDialog } from "./tokens/EditTokenDialog";

type TokenDialogValue = {
  id: string;
  name: string;
};

const _AccountFragment = graphql(`
  fragment UserAccessTokens_Account on User {
    id
    slug
    name
    teams {
      id
      name
      slug
    }
    userAccessTokens {
      id
      name
      createdAt
      expireAt
      lastUsedAt
      createdBy
      scope {
        id
        name
        slug
      }
    }
  }
`);

const ActionsMenu = ({
  token,
  onRename,
  onDelete,
}: {
  token: DocumentType<typeof _AccountFragment>["userAccessTokens"][number];
  onRename: (value: TokenDialogValue) => void;
  onDelete: (value: TokenDialogValue) => void;
}) => {
  return (
    <MenuTrigger>
      <ProviderMenuButton />
      <Popover>
        <Menu aria-label={`${token.name} options`}>
          <MenuItem
            onAction={() => {
              onRename({ id: token.id, name: token.name });
            }}
          >
            <MenuItemIcon>
              <PencilIcon />
            </MenuItemIcon>
            Rename
          </MenuItem>
          <MenuItem
            variant="danger"
            onAction={() => {
              onDelete({ id: token.id, name: token.name });
            }}
          >
            <MenuItemIcon>
              <Trash2Icon />
            </MenuItemIcon>
            Delete
          </MenuItem>
        </Menu>
      </Popover>
    </MenuTrigger>
  );
};

const UserAccessTokenList = ({
  account,
  onRename,
  onDelete,
}: {
  account: DocumentType<typeof _AccountFragment>;
  onRename: (value: TokenDialogValue) => void;
  onDelete: (value: TokenDialogValue) => void;
}) => {
  const now = new Date();
  const columns = "grid-cols-[5fr_1fr_1fr_1fr_2rem]";

  return (
    <List className="min-w-160 rounded-none">
      <ListHeaderRow className={clsx("grid items-center gap-x-6", columns)}>
        <div className="min-w-0">Name</div>
        <div className="min-w-0">Created</div>
        <div className="min-w-0">Last used</div>
        <div className="min-w-0">Expires</div>
        <div />
      </ListHeaderRow>

      {account.userAccessTokens.map((token) => {
        const isExpired =
          token.expireAt != null && new Date(token.expireAt) < now;
        const scopeLabel = formatList(token.scope.map((a) => a.name ?? a.slug));

        return (
          <ListRow
            key={token.id}
            className={clsx(
              "grid items-center gap-x-6 gap-y-0 px-4 py-1.5 text-sm",
              columns,
            )}
          >
            <div className="min-w-0 truncate py-2">
              <div className="truncate font-medium">{token.name}</div>
              <div className="text-low mt-0.5 overflow-auto text-xs">
                <span className="font-medium">Scope:</span> {scopeLabel}
              </div>
            </div>
            <div
              className="text-low min-w-0 truncate py-2 text-xs whitespace-nowrap"
              data-visual-test="transparent"
            >
              <Time date={token.createdAt} />
            </div>
            <div
              className="text-low min-w-0 truncate py-2 text-xs whitespace-nowrap"
              data-visual-test="transparent"
            >
              {token.lastUsedAt ? <Time date={token.lastUsedAt} /> : "-"}
            </div>
            <div
              className={clsx(
                "min-w-0 truncate py-2 text-xs whitespace-nowrap",
                isExpired ? "text-danger-low" : "text-low",
              )}
              data-visual-test="transparent"
            >
              {token.expireAt ? (
                <>
                  {isExpired ? "Expired " : ""}
                  <Time date={token.expireAt} />
                </>
              ) : (
                "-"
              )}
            </div>
            <div>
              <ActionsMenu
                token={token}
                onRename={onRename}
                onDelete={onDelete}
              />
            </div>
          </ListRow>
        );
      })}
    </List>
  );
};

export function UserAccessTokens(props: {
  account: DocumentType<typeof _AccountFragment>;
}) {
  const { account } = props;
  invariant(account.__typename === "User");
  const editing = useDialogValueState<TokenDialogValue | null>(null);
  const deleting = useDialogValueState<TokenDialogValue | null>(null);

  function handleRename(value: TokenDialogValue) {
    editing.open(value);
  }

  function handleDelete(value: TokenDialogValue) {
    deleting.open(value);
  }

  return (
    <Card>
      <CardBody>
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <CardTitle id="personal-access-tokens">
              Personal Access Tokens
            </CardTitle>
            <CardParagraph>
              Personal access tokens allow you to authenticate with the Argos
              API on your behalf.
            </CardParagraph>
          </div>
          <DialogTrigger>
            <Button variant="secondary" className="shrink-0">
              <ButtonIcon>
                <PlusIcon />
              </ButtonIcon>
              Generate new token
            </Button>
            <Modal>
              <CreateTokenDialog account={account} />
            </Modal>
          </DialogTrigger>
        </div>

        <div className="flex flex-col gap-2 overflow-auto">
          {account.userAccessTokens.length > 0 && (
            <>
              <UserAccessTokenList
                account={account}
                onRename={handleRename}
                onDelete={handleDelete}
              />
              <div className="text-low text-sm">
                Tokens are shown only once at creation. Store them in a safe
                place.
              </div>
            </>
          )}
        </div>
      </CardBody>

      {editing.value ? (
        <Modal isOpen={editing.isOpen} onOpenChange={editing.onOpenChange}>
          <EditTokenDialog id={editing.value.id} name={editing.value.name} />
        </Modal>
      ) : null}

      {deleting.value ? (
        <Modal isOpen={deleting.isOpen} onOpenChange={deleting.onOpenChange}>
          <DeleteTokenDialog
            id={deleting.value.id}
            name={deleting.value.name}
          />
        </Modal>
      ) : null}
    </Card>
  );
}
