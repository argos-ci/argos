import { useMutation } from "@apollo/client";
import { MoreVerticalIcon } from "lucide-react";
import { memo, useState } from "react";
import { useNavigate } from "react-router-dom";

import { useQuery } from "@/containers/Apollo";
import { FragmentType, graphql, useFragment } from "@/gql";
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
import { getGraphQLErrorMessage } from "@/ui/Form";
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
import { Tooltip } from "@/ui/Tooltip";

import { AccountAvatar } from "../AccountAvatar";
import { useAssertAuthTokenPayload } from "../Auth";

const NB_MEMBERS_PER_PAGE = 10;

const TeamMembersQuery = graphql(`
  query TeamMembers_teamMembers($id: ID!, $first: Int!, $after: Int!) {
    team: teamById(id: $id) {
      id
      members(first: $first, after: $after) {
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
            ...RemoveFromTeamDialog_User
          }
          ...LevelSelect_TeamMember
        }
        pageInfo {
          hasNextPage
          totalCount
        }
      }
    }
  }
`);

const TeamFragment = graphql(`
  fragment TeamMembers_Team on Team {
    id
    name
    slug
    inviteLink
    me {
      id
      level
      user {
        id
        name
        slug
        avatar {
          ...AccountAvatarFragment
        }
        ...RemoveFromTeamDialog_User
      }
      ...LevelSelect_TeamMember
    }
  }
`);

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
    ) {
      teamMemberId
    }
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
        {error && <FormError>{getGraphQLErrorMessage(error)}</FormError>}
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

const RemoveFromTeamDialogUserFragment = graphql(`
  fragment RemoveFromTeamDialog_User on User {
    id
    name
    slug
    avatar {
      ...AccountAvatarFragment
    }
  }
`);

type RemoveFromTeamDialogProps = {
  state: DialogState;
  teamName: string;
  teamAccountId: string;
  user: FragmentType<typeof RemoveFromTeamDialogUserFragment>;
};

const RemoveFromTeamDialog = memo<RemoveFromTeamDialogProps>((props) => {
  const user = useFragment(RemoveFromTeamDialogUserFragment, props.user);
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
              members: (existingMembers, { readField }) => {
                return {
                  ...existingMembers,
                  edges: existingMembers.edges.filter(
                    (userRef: any) =>
                      readField("id", userRef) !==
                      data.removeUserFromTeam.teamMemberId,
                  ),
                  pageInfo: {
                    ...existingMembers.pageInfo,
                    totalCount: existingMembers.pageInfo.totalCount - 1,
                  },
                };
              },
            },
          });
        }
      },
      variables: {
        teamAccountId: props.teamAccountId,
        userAccountId: user.id,
      },
    },
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
          <ListRow className="px-4 py-2 text-left">
            <AccountAvatar
              avatar={user.avatar}
              size={36}
              className="shrink-0"
            />
            <div>
              <div className="text-sm font-semibold">{user.name}</div>
              <div className="text-xs text-low">{user.slug}</div>
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
        <MoreVerticalIcon className="h-4 w-4" />
      </MenuButton>
      <Menu state={menu} aria-label="Member actions">
        {props.isMe ? (
          <Tooltip
            content={
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
          </Tooltip>
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

const LevelSelectTeamMemberFragment = graphql(`
  fragment LevelSelect_TeamMember on TeamMember {
    id
    level
    user {
      id
    }
  }
`);

const LevelSelect = (props: {
  teamId: string;
  member: FragmentType<typeof LevelSelectTeamMemberFragment>;
}) => {
  const member = useFragment(LevelSelectTeamMemberFragment, props.member);
  const [setTeamMemberLevel] = useMutation(SetTeamMemberLevelMutation);
  const select = useSelectState({
    gutter: 4,
    value: member.level,
    setValue: (value) => {
      setTeamMemberLevel({
        variables: {
          teamAccountId: props.teamId,
          userAccountId: member.user.id,
          level: value as TeamUserLevel,
        },
        optimisticResponse: {
          setTeamMemberLevel: {
            id: member.user.id,
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
      <Select state={select} className="w-full text-sm text-low">
        <div className="flex w-full items-center justify-between gap-2">
          {levelLabel[value]}
          <SelectArrow />
        </div>
      </Select>

      <SelectPopover aria-label="Levels" state={select}>
        <SelectItem state={select} value="member">
          <div className="flex flex-col">
            <div>Member</div>
            <div className="text-low">See and review builds</div>
          </div>
        </SelectItem>
        <SelectItem state={select} value="owner">
          <div className="flex flex-col">
            <div>Owner</div>
            <div className="text-low">
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

          <div className="flex gap-2 rounded border p-2">
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
  const authPayload = useAssertAuthTokenPayload();
  const team = useFragment(TeamFragment, props.team);
  const [removeAccountId, setRemoveAccountId] = useState<string | null>(null);
  const removeTeamDialog = useDialogState({
    open: removeAccountId !== null,
    setOpen: (open) => {
      if (!open) {
        setRemoveAccountId(null);
      }
    },
  });
  const me = team.me;
  const amOwner = me.level === TeamUserLevel.Owner;
  const { data, fetchMore } = useQuery(TeamMembersQuery, {
    variables: {
      id: team.id,
      after: 0,
      first: NB_MEMBERS_PER_PAGE,
    },
  });
  if (!data) return null;
  if (data.team?.__typename !== "Team") {
    throw new Error("Invariant: Invalid team");
  }
  const teamName = team.name || team.slug;
  const lastOne = data.team.members.pageInfo.totalCount === 1;
  const members = Array.from(data.team.members.edges);
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
                <ListRow key={user.id} className="px-4 py-2 items-center">
                  <AccountAvatar
                    avatar={user.avatar}
                    size={36}
                    className="shrink-0"
                  />
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <div className="text-sm font-semibold">{user.name}</div>
                    </div>
                    <div className="text-xs text-low">{user.slug}</div>
                  </div>
                  {isMe || !amOwner ? (
                    <div className="text-sm text-low">
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
          {data.team.members.pageInfo.hasNextPage && (
            <div className="pt-2">
              <Button
                variant="outline"
                color="neutral"
                className="w-full justify-center"
                onClick={() => {
                  fetchMore({
                    variables: {
                      after: members.length,
                    },
                    updateQuery: (prev, { fetchMoreResult }) => {
                      if (!fetchMoreResult) return prev;
                      if (!fetchMoreResult.team) return prev;
                      if (!prev.team) return prev;
                      return {
                        team: {
                          ...prev.team,
                          members: {
                            ...prev.team.members,
                            edges: [
                              ...prev.team.members.edges,
                              ...fetchMoreResult.team.members.edges,
                            ],
                            pageInfo: fetchMoreResult.team.members.pageInfo,
                          },
                        },
                      };
                    },
                  });
                }}
              >
                Load more
              </Button>
            </div>
          )}
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
                      (member) => member.user.id === removeAccountId,
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
