import { Reference, useMutation } from "@apollo/client";
import * as React from "react";
import { useNavigate } from "react-router-dom";

import { useQuery } from "@/containers/Apollo";
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
import { getGraphQLErrorMessage } from "@/ui/Form";
import { FormError } from "@/ui/FormError";
import { List, ListRow, ListTitle } from "@/ui/List";
import {
  Select,
  SelectArrow,
  SelectItem,
  SelectPopover,
  useSelectState,
} from "@/ui/Select";
import { Tooltip } from "@/ui/Tooltip";

import { AccountAvatar } from "../AccountAvatar";
import { useAssertAuthTokenPayload, useAuthTokenPayload } from "../Auth";
import { invariant } from "@/util/invariant";
import { GithubAccountLink } from "../GithubAccountLink";
import { MarkGithubIcon } from "@primer/octicons-react";
import { RemoveMenu, TeamMemberLabel, UserListRow } from "../UserList";

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
            ...UserListRow_user
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

const TeamGithubMembersQuery = graphql(`
  query TeamMembers_githubMembers($id: ID!, $first: Int!, $after: Int!) {
    team: teamById(id: $id) {
      id
      githubMembers(first: $first, after: $after) {
        edges {
          id
          githubAccount {
            id
            login
            avatar {
              ...AccountAvatarFragment
            }
          }
          teamMember {
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
        pageInfo {
          hasNextPage
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
    ssoGithubAccount {
      id
      ...TeamGithubMembersList_GithubAccount
    }
    plan {
      id
      fineGrainedAccessControlIncluded
    }
    me {
      id
      level
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

const LeaveTeamDialog = React.memo(
  (props: { state: DialogState; teamName: string; teamAccountId: string }) => {
    const authPayload = useAuthTokenPayload();
    const [leaveTeam, { loading, error }] = useMutation(LeaveTeamMutation, {
      variables: {
        teamAccountId: props.teamAccountId,
      },
      onCompleted() {
        props.state.hide();
        navigate(authPayload ? `/${authPayload.account.slug}` : "/");
      },
    });
    const navigate = useNavigate();
    return (
      <>
        <DialogBody confirm>
          <DialogTitle>Leave Team</DialogTitle>
          <DialogText>
            You are about to leave {props.teamName}. In order to regain access
            at a later time, a Team Owner must invite you.
          </DialogText>
          <DialogText>Are you sure you want to continue?</DialogText>
        </DialogBody>
        <DialogFooter>
          {error && <FormError>{getGraphQLErrorMessage(error)}</FormError>}
          <DialogDismiss>Cancel</DialogDismiss>
          <Button
            disabled={loading}
            color="danger"
            onClick={() => {
              leaveTeam().catch(() => {});
            }}
          >
            Leave Team
          </Button>
        </DialogFooter>
      </>
    );
  },
);

const RemoveFromTeamDialogUserFragment = graphql(`
  fragment RemoveFromTeamDialog_User on User {
    id
    ...UserListRow_user
  }
`);

type RemovedUser = DocumentType<typeof RemoveFromTeamDialogUserFragment>;

const RemoveFromTeamDialog = React.memo(
  (props: {
    state: DialogState;
    teamName: string;
    teamAccountId: string;
    user: RemovedUser;
  }) => {
    const [removeFromTeam, { loading, error }] = useMutation(
      RemoveUserFromTeamMutation,
      {
        onCompleted() {
          props.state.hide();
        },
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
                      (ref: Reference) =>
                        readField("id", ref) !==
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
          userAccountId: props.user.id,
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
          <List className="text-left">
            <UserListRow user={props.user} />
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
            onClick={() => {
              removeFromTeam().catch(() => {});
            }}
          >
            Remove from Team
          </Button>
        </DialogFooter>
      </>
    );
  },
);

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
  hasFineGrainedAccessControl: boolean;
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
          {TeamMemberLabel[value]}
          <SelectArrow />
        </div>
      </Select>

      <SelectPopover aria-label="Levels" state={select}>
        {props.hasFineGrainedAccessControl && (
          <SelectItem state={select} value="contributor">
            <div className="flex flex-col">
              <div>Contributor</div>
              <div className="text-low">
                Access control at the project level
              </div>
            </div>
          </SelectItem>
        )}
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

function TeamMembersList(props: {
  teamId: string;
  teamName: string;
  amOwner: boolean;
  onRemove: (user: RemovedUser) => void;
  hasGithubSSO: boolean;
  hasFineGrainedAccessControl: boolean;
}) {
  const authPayload = useAssertAuthTokenPayload();
  const { data, fetchMore } = useQuery(TeamMembersQuery, {
    variables: {
      id: props.teamId,
      after: 0,
      first: NB_MEMBERS_PER_PAGE,
    },
  });
  if (!data) return null;
  if (data.team?.__typename !== "Team") {
    throw new Error("Invariant: Invalid team");
  }
  const members = data.team.members.edges;
  const lastOne =
    !props.hasGithubSSO && data.team.members.pageInfo.totalCount === 1;
  return (
    <div className="my-4">
      {props.hasGithubSSO && <ListTitle>Invited members</ListTitle>}
      {members.length > 0 ? (
        <List>
          {members.map((member) => {
            const { user } = member;
            const isMe = authPayload.account.id === user.id;
            return (
              <UserListRow key={user.id} user={user}>
                {isMe || !props.amOwner ? (
                  <div className="text-sm text-low">
                    {TeamMemberLabel[member.level]}
                  </div>
                ) : (
                  <div>
                    <LevelSelect
                      teamId={props.teamId}
                      member={member}
                      hasFineGrainedAccessControl={
                        props.hasFineGrainedAccessControl
                      }
                    />
                  </div>
                )}
                {isMe || props.amOwner ? (
                  <RemoveMenu
                    disabled={lastOne}
                    tooltip={
                      isMe && lastOne
                        ? "You are the last user of this team, you can't leave it"
                        : null
                    }
                    label="Member actions"
                    actionLabel={isMe ? "Leave Team" : "Remove from Team"}
                    onRemove={() => props.onRemove(user as RemovedUser)}
                  />
                ) : (
                  <div className="w-4" />
                )}
              </UserListRow>
            );
          })}
        </List>
      ) : (
        <div className="my-2">No invited member</div>
      )}
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
    </div>
  );
}

const TeamGithubMembersListGithubAccountFragment = graphql(`
  fragment TeamGithubMembersList_GithubAccount on GithubAccount {
    id
    ...GithubAccountLink_GithubAccount
  }
`);

function TeamGithubMembersList(props: {
  teamId: string;
  teamName: string;
  amOwner: boolean;
  onRemove: (user: RemovedUser) => void;
  githubAccount: FragmentType<
    typeof TeamGithubMembersListGithubAccountFragment
  >;
  hasFineGrainedAccessControl: boolean;
}) {
  const githubAccount = useFragment(
    TeamGithubMembersListGithubAccountFragment,
    props.githubAccount,
  );
  const authPayload = useAssertAuthTokenPayload();
  const { data, fetchMore } = useQuery(TeamGithubMembersQuery, {
    variables: {
      id: props.teamId,
      after: 0,
      first: NB_MEMBERS_PER_PAGE,
    },
  });
  if (!data) return null;
  invariant(data.team?.__typename === "Team", "Invalid team");
  if (!data.team.githubMembers) {
    return null;
  }
  const members = data.team.githubMembers.edges;
  return (
    <div className="my-4">
      <ListTitle>
        <MarkGithubIcon className="w-4 h-4 mr-1.5" />
        GitHub members synced from{" "}
        <GithubAccountLink githubAccount={githubAccount} />
      </ListTitle>
      <List>
        {members.map((member) => {
          const teamMember = member.teamMember ?? null;
          const user = teamMember?.user ?? null;
          const isMe = Boolean(user && authPayload.account.id === user.id);
          return (
            <ListRow key={member.id} className="px-4 py-2 items-center">
              <AccountAvatar
                avatar={user?.avatar ?? member.githubAccount.avatar}
                size={36}
                className="shrink-0"
              />
              {user ? (
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <div className="text-sm font-semibold">{user.name}</div>
                  </div>
                  <div className="text-xs text-low">{user.slug}</div>
                </div>
              ) : (
                <div className="flex-1 text-sm font-semibold">
                  {member.githubAccount.login}
                </div>
              )}
              {isMe || !props.amOwner || !teamMember ? (
                <div className="text-sm text-low">
                  {teamMember ? (
                    TeamMemberLabel[teamMember.level]
                  ) : (
                    <Tooltip content="This user is not yet registered on Argos, you will be able to modify its permissions after its first login.">
                      <div>Pending</div>
                    </Tooltip>
                  )}
                </div>
              ) : (
                <div>
                  <LevelSelect
                    teamId={props.teamId}
                    member={teamMember}
                    hasFineGrainedAccessControl={
                      props.hasFineGrainedAccessControl
                    }
                  />
                </div>
              )}
              <div className="w-4" />
            </ListRow>
          );
        })}
      </List>
      {data.team.githubMembers.pageInfo.hasNextPage && (
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
                  if (!prev.team.githubMembers) return prev;
                  if (!fetchMoreResult.team.githubMembers) return prev;
                  return {
                    team: {
                      ...prev.team,
                      githubMembers: {
                        ...prev.team.githubMembers,
                        edges: [
                          ...prev.team.githubMembers.edges,
                          ...fetchMoreResult.team.githubMembers.edges,
                        ],
                        pageInfo: fetchMoreResult.team.githubMembers.pageInfo,
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
    </div>
  );
}

export const TeamMembers = (props: {
  team: FragmentType<typeof TeamFragment>;
}) => {
  const authPayload = useAssertAuthTokenPayload();
  const team = useFragment(TeamFragment, props.team);
  const [removedUser, setRemovedUser] = React.useState<RemovedUser | null>(
    null,
  );
  const removeTeamDialog = useDialogState({
    open: removedUser !== null,
    setOpen: (open) => {
      if (!open) {
        setRemovedUser(null);
      }
    },
  });
  const me = team.me;
  const amOwner = Boolean(me && me.level === TeamUserLevel.Owner);
  const hasGithubSSO = Boolean(team.ssoGithubAccount);
  const hasFineGrainedAccessControl = Boolean(
    team.plan?.fineGrainedAccessControlIncluded,
  );
  const teamName = team.name || team.slug;

  return (
    <Card>
      <CardBody>
        <CardTitle>Members</CardTitle>
        <CardParagraph>
          Add members to your team to give them access to your projects.
        </CardParagraph>
        <TeamMembersList
          teamId={team.id}
          teamName={teamName}
          amOwner={amOwner}
          onRemove={setRemovedUser}
          hasGithubSSO={hasGithubSSO}
          hasFineGrainedAccessControl={hasFineGrainedAccessControl}
        />
        {team.ssoGithubAccount && (
          <TeamGithubMembersList
            teamId={team.id}
            teamName={teamName}
            githubAccount={team.ssoGithubAccount}
            amOwner={amOwner}
            onRemove={setRemovedUser}
            hasFineGrainedAccessControl={hasFineGrainedAccessControl}
          />
        )}
        <Dialog state={removeTeamDialog}>
          {removedUser ? (
            authPayload.account.id === removedUser.id ? (
              <LeaveTeamDialog
                teamName={teamName}
                teamAccountId={team.id}
                state={removeTeamDialog}
              />
            ) : (
              <RemoveFromTeamDialog
                teamName={teamName}
                teamAccountId={team.id}
                user={removedUser}
                state={removeTeamDialog}
              />
            )
          ) : null}
        </Dialog>
      </CardBody>
      <CardFooter className="flex items-center justify-between">
        {team.inviteLink ? (
          <>
            <div>Invite people to collaborate in the Team.</div>
            <InviteLinkButton inviteLink={team.inviteLink} />
          </>
        ) : (
          <>
            <div>Only a owners can invite people in the Team.</div>
          </>
        )}
      </CardFooter>
    </Card>
  );
};
