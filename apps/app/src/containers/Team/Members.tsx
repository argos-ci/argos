import { useMutation } from "@apollo/client";
import { EllipsisVerticalIcon } from "@heroicons/react/20/solid";
import { memo, useState } from "react";
import { useNavigate } from "react-router-dom";

import { DocumentType, FragmentType, graphql, useFragment } from "@/gql";
import { TeamUserLevel } from "@/gql/graphql";
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
import {
  Select,
  SelectArrow,
  SelectItem,
  SelectPopover,
  useSelectState,
} from "@/ui/Select";
import { MagicTooltip } from "@/ui/Tooltip";

import { AccountAvatar } from "../AccountAvatar";
import { useAuthTokenPayload } from "../Auth";

const TeamFragment = graphql(`
  fragment TeamMembers_Team on Team {
    id
    name
    slug
    inviteLink
    members(first: 30, after: 0) {
      edges {
        id
        level
        user {
          id
          name
          slug
          avatar {
            ...AccountAvatarFragment
          }
        }
      }
      pageInfo {
        totalCount
      }
    }
  }
`);

type TeamMember = DocumentType<typeof TeamFragment>["members"]["edges"][0];
type User = TeamMember["user"];

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

const SetTeamMemberLevelMutation = graphql(`
  mutation SetTeamMemberLevelMutation(
    $teamAccountId: ID!
    $userAccountId: ID!
    $level: TeamUserLevel!
  ) {
    setTeamMemberLevel(
      input: {
        teamAccountId: $teamAccountId
        userAccountId: $userAccountId
        level: $level
      }
    ) {
      id
      level
    }
  }
`);

const LevelSelect = (props: { teamId: string; member: TeamMember }) => {
  const [setTeamMemberLevel] = useMutation(SetTeamMemberLevelMutation);
  const select = useSelectState({
    gutter: 4,
    value: props.member.level,
    setValue: (value) => {
      setTeamMemberLevel({
        variables: {
          teamAccountId: props.teamId,
          userAccountId: props.member.user.id,
          level: value as TeamUserLevel,
        },
        optimisticResponse: {
          setTeamMemberLevel: {
            id: props.member.user.id,
            level: value as TeamUserLevel,
            __typename: "TeamMember",
          },
        },
      });
    },
  });

  const value = select.value as TeamUserLevel;

  return (
    <>
      <Select state={select} className="w-full text-sm text-on-light">
        <div className="flex w-full items-center justify-between gap-2">
          {levelLabel[value]}
          <SelectArrow />
        </div>
      </Select>

      <SelectPopover aria-label="Levels" state={select}>
        <SelectItem state={select} value="member">
          <div className="flex flex-col">
            <div>Member</div>
            <div className="text-on-light">See and review builds</div>
          </div>
        </SelectItem>
        <SelectItem state={select} value="owner">
          <div className="flex flex-col">
            <div>Owner</div>
            <div className="text-on-light">
              Admin level access to the entire team
            </div>
          </div>
        </SelectItem>
      </SelectPopover>
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

const levelLabel: Record<TeamUserLevel, string> = {
  owner: "Owner",
  member: "Member",
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
  const lastOne = team.members.pageInfo.totalCount === 1;
  const [removeAccountId, setRemoveAccountId] = useState<string | null>(null);
  const removeTeamDialog = useDialogState({
    open: removeAccountId !== null,
    setOpen: (open) => {
      if (!open) {
        setRemoveAccountId(null);
      }
    },
  });
  // Put current user at the top
  const members = Array.from(team.members.edges);
  const meIndex = members.findIndex(
    (member) => member.user.id === authPayload.account.id
  );
  const me = members[meIndex];
  if (!me) {
    throw new Error("Invariant: me not found in members");
  }
  const amOwner = me.level === TeamUserLevel.Owner;
  if (meIndex !== -1) {
    members.splice(meIndex, 1);
    members.unshift(me);
  }
  return (
    <Card>
      <form>
        <CardBody>
          <CardTitle>Members</CardTitle>
          <CardParagraph>
            Add members to your team to give them access to your projects.
          </CardParagraph>
          <List className="mt-4">
            {members.map((member) => {
              const user = member.user;
              const isMe = authPayload.account.id === user.id;
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
                  {isMe || !amOwner ? (
                    <div className="text-sm text-on-light">
                      {levelLabel[member.level]}
                    </div>
                  ) : (
                    <div>
                      <LevelSelect teamId={team.id} member={member} />
                    </div>
                  )}
                  {isMe || amOwner ? (
                    <ActionsMenu
                      teamName={teamName}
                      accountId={team.id}
                      lastOne={lastOne}
                      onRemove={() => setRemoveAccountId(user.id)}
                      isMe={authPayload.account.id === user.id}
                    />
                  ) : (
                    <div className="w-4" />
                  )}
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
                    members.find(
                      (member) => member.user.id === removeAccountId
                    )!.user
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
