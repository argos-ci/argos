import { useMutation } from "@apollo/client";
import { EllipsisVerticalIcon } from "@heroicons/react/20/solid";
import { memo, useState } from "react";
import { useNavigate } from "react-router-dom";

import { DocumentType, FragmentType, graphql, useFragment } from "@/gql";
import { Button } from "@/ui/Button";
import {
  Card,
  CardBody,
  CardFooter,
  CardParagraph,
  CardTitle,
} from "@/ui/Card";
import { CopyButton } from "@/ui/CopyButton";
import {
  Dialog,
  DialogBody,
  DialogDisclosure,
  DialogDismiss,
  DialogFooter,
  DialogState,
  DialogText,
  DialogTitle,
  useDialogState,
} from "@/ui/Dialog";
import { FormError } from "@/ui/FormError";
import { List, ListRow } from "@/ui/List";
import { Menu, MenuButton, MenuItem, useMenuState } from "@/ui/Menu";
import { MagicTooltip } from "@/ui/Tooltip";

import { AccountAvatar } from "../AccountAvatar";
import { useAuthTokenPayload } from "../Auth";

const TeamFragment = graphql(`
  fragment TeamMembers_Team on Team {
    id
    name
    slug
    inviteLink
    users(first: 30, after: 0) {
      edges {
        id
        name
        slug
        avatar {
          ...AccountAvatarFragment
        }
      }
      pageInfo {
        totalCount
      }
    }
  }
`);

type User = DocumentType<typeof TeamFragment>["users"]["edges"][0];

const LeaveTeamMutation = graphql(`
  mutation TeamMembers_leaveTeam($teamAccountId: ID!) {
    leaveTeam(input: { teamAccountId: $teamAccountId })
  }
`);

const RemoveUserFromTeamMutation = graphql(`
  mutation TeamMembers_removeUserFromTeam(
    $teamAccountId: ID!
    $userAccountId: ID!
  ) {
    removeUserFromTeam(
      input: { teamAccountId: $teamAccountId, userAccountId: $userAccountId }
    )
  }
`);

type LeaveTeamDialogProps = {
  state: DialogState;
  teamName: string;
  teamAccountId: string;
};

const LeaveTeamDialog = memo<LeaveTeamDialogProps>((props) => {
  const [leaveTeam, { loading, error }] = useMutation(LeaveTeamMutation, {
    variables: {
      teamAccountId: props.teamAccountId,
    },
  });
  const navigate = useNavigate();
  return (
    <>
      <DialogBody confirm>
        <DialogTitle>Leave Team</DialogTitle>
        <DialogText>
          You are about to leave {props.teamName}. In order to regain access at
          a later time, a Team Owner must invite you.
        </DialogText>
        <DialogText>Are you sure you want to continue?</DialogText>
      </DialogBody>
      <DialogFooter>
        {error && (
          <FormError>Something went wrong. Please try again.</FormError>
        )}
        <DialogDismiss>Cancel</DialogDismiss>
        <Button
          disabled={loading}
          color="danger"
          onClick={async () => {
            await leaveTeam();
            props.state.hide();
            navigate("/");
          }}
        >
          Leave Team
        </Button>
      </DialogFooter>
    </>
  );
});

type RemoveFromTeamDialogProps = {
  state: DialogState;
  teamName: string;
  teamAccountId: string;
  user: User;
};

const RemoveFromTeamDialog = memo<RemoveFromTeamDialogProps>((props) => {
  const [removeFromTeam, { loading, error }] = useMutation(
    RemoveUserFromTeamMutation,
    {
      update(cache, { data }) {
        if (data?.removeUserFromTeam) {
          cache.modify({
            id: cache.identify({
              __typename: "Team",
              id: props.teamAccountId,
            }),
            fields: {
              users: (existingUsers, { readField }) => {
                return {
                  ...existingUsers,
                  edges: existingUsers.edges.filter(
                    (userRef: any) => readField("id", userRef) !== props.user.id
                  ),
                  pageInfo: {
                    ...existingUsers.pageInfo,
                    totalCount: existingUsers.pageInfo.totalCount - 1,
                  },
                };
              },
            },
          });
        }
      },
      variables: {
        teamAccountId: props.teamAccountId,
        userAccountId: props.user.id,
      },
    }
  );
  return (
    <>
      <DialogBody confirm>
        <DialogTitle>Remove Team Member</DialogTitle>
        <DialogText>
          You are about to remove the following Team Member, are you sure you
          want to continue?
        </DialogText>
        <List>
          <ListRow className="px-4 py-2">
            <AccountAvatar
              avatar={props.user.avatar}
              size={36}
              className="shrink-0"
            />
            <div>
              <div className="flex items-center gap-2">
                <div className="text-sm font-semibold">{props.user.name}</div>
              </div>
              <div className="text-xs text-slate-500">{props.user.slug}</div>
            </div>
          </ListRow>
        </List>
      </DialogBody>
      <DialogFooter>
        {error && (
          <FormError>Something went wrong. Please try again.</FormError>
        )}
        <DialogDismiss>Cancel</DialogDismiss>
        <Button
          disabled={loading}
          color="danger"
          onClick={async () => {
            await removeFromTeam();
            props.state.hide();
          }}
        >
          Remove from Team
        </Button>
      </DialogFooter>
    </>
  );
});

type ActionsMenuProps = {
  teamName: string;
  accountId: string;
  lastOne: boolean;
  onRemove: () => void;
  isMe: boolean;
};

const ActionsMenu = (props: ActionsMenuProps) => {
  const menu = useMenuState({ gutter: 4 });

  return (
    <>
      <MenuButton
        state={menu}
        className="flex shrink-0 items-center justify-center"
      >
        <EllipsisVerticalIcon className="h-4 w-4" />
      </MenuButton>
      <Menu state={menu} aria-label="Member actions">
        {props.isMe ? (
          <MagicTooltip
            tooltip={
              props.lastOne
                ? "You are the last user of this team, you can't leave it"
                : null
            }
          >
            <MenuItem
              variant="danger"
              state={menu}
              onClick={() => {
                props.onRemove();
                menu.hide();
              }}
              disabled={props.lastOne}
              accessibleWhenDisabled
            >
              Leave Team
            </MenuItem>
          </MagicTooltip>
        ) : (
          <MenuItem
            variant="danger"
            state={menu}
            onClick={() => {
              props.onRemove();
              menu.hide();
            }}
            disabled={props.lastOne}
            accessibleWhenDisabled
          >
            Remove from Team
          </MenuItem>
        )}
      </Menu>
    </>
  );
};

type InviteLinkButtonProps = {
  inviteLink: string;
};

const InviteLinkButton = (props: InviteLinkButtonProps) => {
  const dialog = useDialogState();
  return (
    <>
      <DialogDisclosure state={dialog}>
        {(disclosureProps) => (
          <Button {...disclosureProps} color="neutral" variant="outline">
            Invite Link
          </Button>
        )}
      </DialogDisclosure>
      <Dialog state={dialog}>
        <DialogBody>
          <DialogTitle>Invite Link</DialogTitle>
          <DialogText>
            Share this link with your friends to invite them to your team.
          </DialogText>

          <div className="flex gap-2 rounded border border-border p-2">
            <pre className="w-0 flex-1 overflow-auto">
              <code>{props.inviteLink}</code>
            </pre>
            <CopyButton text={props.inviteLink} />
          </div>

          <DialogText>
            <strong>Warning:</strong> Anyone with this link will be able to join
            your team.
          </DialogText>
        </DialogBody>
        <DialogFooter>
          <DialogDismiss single>OK</DialogDismiss>
        </DialogFooter>
      </Dialog>
    </>
  );
};

export const TeamMembers = (props: {
  team: FragmentType<typeof TeamFragment>;
}) => {
  const authPayload = useAuthTokenPayload();
  if (!authPayload) {
    throw new Error("Forbidden");
  }
  const team = useFragment(TeamFragment, props.team);
  const teamName = team.name || team.slug;
  const lastOne = team.users.pageInfo.totalCount === 1;
  const [removeAccountId, setRemoveAccountId] = useState<string | null>(null);
  const removeTeamDialog = useDialogState({
    open: removeAccountId !== null,
    setOpen: (open) => {
      if (!open) {
        setRemoveAccountId(null);
      }
    },
  });
  return (
    <Card>
      <form>
        <CardBody>
          <CardTitle>Members</CardTitle>
          <CardParagraph>
            Add members to your team to give them access to your projects.
          </CardParagraph>
          <List className="mt-4">
            {team.users.edges.map((user) => {
              return (
                <ListRow key={user.id} className="px-4 py-2">
                  <AccountAvatar
                    avatar={user.avatar}
                    size={36}
                    className="shrink-0"
                  />
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <div className="text-sm font-semibold">{user.name}</div>
                    </div>
                    <div className="text-xs text-slate-500">{user.slug}</div>
                  </div>
                  <ActionsMenu
                    teamName={teamName}
                    accountId={team.id}
                    lastOne={lastOne}
                    onRemove={() => setRemoveAccountId(user.id)}
                    isMe={authPayload.account.id === user.id}
                  />
                </ListRow>
              );
            })}
          </List>
          <Dialog state={removeTeamDialog}>
            {removeAccountId ? (
              authPayload.account.id === removeAccountId ? (
                <LeaveTeamDialog
                  teamName={teamName}
                  teamAccountId={team.id}
                  state={removeTeamDialog}
                />
              ) : (
                <RemoveFromTeamDialog
                  teamName={teamName}
                  teamAccountId={team.id}
                  user={
                    team.users.edges.find(
                      (user) => user.id === removeAccountId
                    )!
                  }
                  state={removeTeamDialog}
                />
              )
            ) : null}
          </Dialog>
        </CardBody>
      </form>
      <CardFooter className="flex items-center justify-between">
        <div>Invite people to collaborate in the Team.</div>
        <InviteLinkButton inviteLink={team.inviteLink} />
      </CardFooter>
    </Card>
  );
};
