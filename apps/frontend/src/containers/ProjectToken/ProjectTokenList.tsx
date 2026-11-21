import { PROJECT_TOKEN_EXPIRY_WARNING_MS } from "@argos/schemas/project-token";
import clsx from "clsx";
import { PencilIcon, Trash2Icon } from "lucide-react";

import { ProviderMenuButton } from "@/containers/User/ui";
import { DocumentType, graphql } from "@/gql";
import { Chip } from "@/ui/Chip";
import { useDialogValueState } from "@/ui/Dialog";
import { List, ListHeaderRow, ListRow } from "@/ui/List";
import { Menu, MenuItem, MenuRoot, MenuTrigger } from "@/ui/menu-kit";
import { Modal } from "@/ui/Modal";
import { Time } from "@/ui/Time";

import { formatProjectTokenPermissions } from "./permissions";
import {
  RenameProjectTokenDialog,
  RevokeProjectTokenDialog,
  type ProjectTokenDialogValue,
} from "./ProjectTokenDialogs";

const _ProjectTokenFragment = graphql(`
  fragment ProjectTokenList_ProjectToken on ProjectToken {
    id
    name
    createdAt
    expireAt
    lastUsedAt
    permissions
    viewerCanManage
    projects {
      id
      name
    }
  }
`);

type ProjectToken = DocumentType<typeof _ProjectTokenFragment>;

function TokenActions(props: {
  token: ProjectToken;
  onRename: (value: ProjectTokenDialogValue) => void;
  onRevoke: (value: ProjectTokenDialogValue) => void;
}) {
  const { token, onRename, onRevoke } = props;
  const label = `${token.name} options`;
  const value = { id: token.id, name: token.name };
  return (
    <MenuRoot>
      <MenuTrigger>
        <ProviderMenuButton aria-label={label} />
      </MenuTrigger>
      <Menu aria-label={label}>
        <MenuItem icon={<PencilIcon />} onAction={() => onRename(value)}>
          Rename
        </MenuItem>
        <MenuItem
          icon={<Trash2Icon />}
          variant="danger"
          onAction={() => onRevoke(value)}
        >
          Revoke
        </MenuItem>
      </Menu>
    </MenuRoot>
  );
}

/**
 * What the token reaches, under its name. On a project's page, only the other
 * projects are worth naming.
 */
function TokenScope(props: { token: ProjectToken; projectId?: string }) {
  const { token, projectId } = props;
  const projects = getProjectsLabel(token, projectId);
  return (
    <div className="text-low mt-0.5 flex flex-col gap-0.5 text-xs">
      {projects && <span className="truncate">{projects}</span>}
      <span className="truncate">
        {formatProjectTokenPermissions(token.permissions)}
      </span>
    </div>
  );
}

function getProjectsLabel(
  token: ProjectToken,
  projectId: string | undefined,
): string | null {
  const names = token.projects
    .filter((project) => project.id !== projectId)
    .map((project) => project.name);
  if (projectId) {
    return names.length > 0 ? `Also linked to ${names.join(", ")}` : null;
  }
  return names.length > 0 ? names.join(", ") : "No project";
}

export function ProjectTokenList(props: {
  tokens: ProjectToken[];
  /** The project the list is shown on, if any. */
  projectId?: string;
}) {
  const { tokens, projectId } = props;
  const renaming = useDialogValueState<ProjectTokenDialogValue | null>(null);
  const revoking = useDialogValueState<ProjectTokenDialogValue | null>(null);
  const now = new Date();
  const columns = "grid-cols-[5fr_1fr_1fr_1fr_2rem]";

  return (
    <>
      <List className="min-w-160 rounded-none">
        <ListHeaderRow className={clsx("grid items-center gap-x-6", columns)}>
          <div className="min-w-0">Name</div>
          <div className="min-w-0">Created</div>
          <div className="min-w-0">Last used</div>
          <div className="min-w-0">Expires</div>
          <div />
        </ListHeaderRow>
        {tokens.map((token) => {
          const msLeft = token.expireAt
            ? new Date(token.expireAt).getTime() - now.getTime()
            : null;
          const isExpired = msLeft !== null && msLeft < 0;
          const expiresSoon =
            msLeft !== null &&
            !isExpired &&
            msLeft <= PROJECT_TOKEN_EXPIRY_WARNING_MS;
          return (
            <ListRow
              key={token.id}
              className={clsx(
                "grid items-center gap-x-6 gap-y-0 px-4 py-1.5 text-sm",
                columns,
              )}
            >
              <div className="min-w-0 py-2">
                <div className="flex min-w-0 items-center gap-2">
                  <span className="truncate font-medium">{token.name}</span>
                  {expiresSoon && (
                    <Chip scale="xs" color="warning" className="shrink-0">
                      Expires soon
                    </Chip>
                  )}
                </div>
                <TokenScope token={token} projectId={projectId} />
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
                {token.lastUsedAt ? <Time date={token.lastUsedAt} /> : "Never"}
              </div>
              <div
                className={clsx(
                  "min-w-0 truncate py-2 text-xs whitespace-nowrap",
                  isExpired
                    ? "text-danger-low"
                    : expiresSoon
                      ? "text-warning-low"
                      : "text-low",
                )}
                data-visual-test="transparent"
              >
                {token.expireAt ? (
                  <>
                    {isExpired ? "Expired " : ""}
                    <Time date={token.expireAt} />
                  </>
                ) : (
                  "Never"
                )}
              </div>
              <div>
                {token.viewerCanManage && (
                  <TokenActions
                    token={token}
                    onRename={renaming.open}
                    onRevoke={revoking.open}
                  />
                )}
              </div>
            </ListRow>
          );
        })}
      </List>

      {renaming.value ? (
        <Modal open={renaming.isOpen} onOpenChange={renaming.onOpenChange}>
          <RenameProjectTokenDialog {...renaming.value} />
        </Modal>
      ) : null}

      {revoking.value ? (
        <Modal open={revoking.isOpen} onOpenChange={revoking.onOpenChange}>
          <RevokeProjectTokenDialog {...revoking.value} />
        </Modal>
      ) : null}
    </>
  );
}
