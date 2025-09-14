import {
  memo,
  useDeferredValue,
  useId,
  useMemo,
  useState,
  useTransition,
} from "react";
import { Reference, useMutation, useSuspenseQuery } from "@apollo/client";
import { invariant } from "@argos/util/invariant";
import { MarkGithubIcon } from "@primer/octicons-react";
import { SearchIcon, UsersIcon } from "lucide-react";
import { Heading, TabPanel, Tabs, Text } from "react-aria-components";
import { useNavigate } from "react-router-dom";

import { AccountAvatar } from "@/containers/AccountAvatar";
import {
  useAssertAuthTokenPayload,
  useAuthTokenPayload,
} from "@/containers/Auth";
import { GithubAccountLink } from "@/containers/GithubAccountLink";
import {
  RemoveMenu,
  TeamMemberLabel,
  UserListRow,
} from "@/containers/UserList";
import { DocumentType, graphql } from "@/gql";
import {
  AccountPermission,
  TeamMembersOrderBy,
  TeamUserLevel,
} from "@/gql/graphql";
import { Button } from "@/ui/Button";
import {
  Card,
  CardBody,
  CardFooter,
  CardParagraph,
  CardTitle,
} from "@/ui/Card";
import { Chip } from "@/ui/Chip";
import {
  Dialog,
  DialogBody,
  DialogDismiss,
  DialogFooter,
  DialogText,
  DialogTitle,
  DialogTrigger,
  useOverlayTriggerState,
} from "@/ui/Dialog";
import { ErrorMessage } from "@/ui/ErrorMessage";
import { EmptyState, EmptyStateActions, EmptyStateIcon } from "@/ui/Layout";
import { List, ListRow, ListTitle } from "@/ui/List";
import { Modal } from "@/ui/Modal";
import { Switch } from "@/ui/Switch";
import { Tab, TabList } from "@/ui/Tab";
import {
  TextInput,
  TextInputAddon,
  TextInputGroup,
  TextInputIcon,
} from "@/ui/TextInput";
import { Tooltip } from "@/ui/Tooltip";
import { getErrorMessage } from "@/util/error";

import { InviteDialog } from "./InviteDialog";
import { MemberLevelSelect } from "./MemberLevelSelect";
import { SortSelect } from "./SortSelect";
import { SourceSelect, type Source } from "./SourceSelect";

const INITIAL_NB_MEMBERS = 10;
const NB_MEMBERS_PER_PAGE = 100;

const TeamMembersQuery = graphql(`
  query TeamMembers_teamMembers(
    $id: ID!
    $first: Int!
    $after: Int!
    $search: String
    $sso: Boolean
    $orderBy: TeamMembersOrderBy
  ) {
    team: teamById(id: $id) {
      id
      members(
        first: $first
        after: $after
        search: $search
        sso: $sso
        orderBy: $orderBy
      ) {
        edges {
          id
          level
          user {
            id
            ...UserListRow_user
            ...RemoveFromTeamDialog_User
          }
          ...LevelSelect_TeamMember
          fromSSO
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
  query TeamMembers_githubMembers(
    $id: ID!
    $first: Int!
    $after: Int!
    $isTeamMember: Boolean
  ) {
    team: teamById(id: $id) {
      id
      githubMembers(first: $first, after: $after, isTeamMember: $isTeamMember) {
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

const _TeamFragment = graphql(`
  fragment TeamMembers_Team on Team {
    id
    name
    slug
    inviteLink
    permissions
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
    ...InviteDialog_Team
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

const LeaveTeamDialog = memo(
  (props: { teamName: string; teamAccountId: string }) => {
    const state = useOverlayTriggerState();
    const authPayload = useAuthTokenPayload();
    const [leaveTeam, { loading, error }] = useMutation(LeaveTeamMutation, {
      variables: {
        teamAccountId: props.teamAccountId,
      },
      onCompleted() {
        state.close();
        navigate(authPayload ? `/${authPayload.account.slug}` : "/");
      },
    });
    const navigate = useNavigate();
    return (
      <Dialog>
        <DialogBody confirm>
          <DialogTitle>Leave Team</DialogTitle>
          <DialogText>
            You are about to leave {props.teamName}. In order to regain access
            at a later time, a Team Owner must invite you.
          </DialogText>
          <DialogText>Are you sure you want to continue?</DialogText>
        </DialogBody>
        <DialogFooter>
          {error && <ErrorMessage>{getErrorMessage(error)}</ErrorMessage>}
          <DialogDismiss>Cancel</DialogDismiss>
          <Button
            isDisabled={loading}
            variant="destructive"
            onPress={() => {
              leaveTeam().catch(() => {});
            }}
          >
            Leave Team
          </Button>
        </DialogFooter>
      </Dialog>
    );
  },
);

// eslint-disable-next-line @typescript-eslint/no-unused-vars
const RemoveFromTeamDialogUserFragment = graphql(`
  fragment RemoveFromTeamDialog_User on User {
    id
    ...UserListRow_user
  }
`);

type RemovedUser = DocumentType<typeof RemoveFromTeamDialogUserFragment>;

const RemoveFromTeamDialog = memo(
  (props: { teamName: string; teamAccountId: string; user: RemovedUser }) => {
    const state = useOverlayTriggerState();
    const [removeFromTeam, { loading, error }] = useMutation(
      RemoveUserFromTeamMutation,
      {
        onCompleted() {
          state.close();
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
      <Dialog>
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
            <ErrorMessage>Something went wrong. Please try again.</ErrorMessage>
          )}
          <DialogDismiss>Cancel</DialogDismiss>
          <Button
            isDisabled={loading}
            variant="destructive"
            onPress={() => {
              removeFromTeam().catch(() => {});
            }}
          >
            Remove from Team
          </Button>
        </DialogFooter>
      </Dialog>
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

const _LevelSelectTeamMemberFragment = graphql(`
  fragment LevelSelect_TeamMember on TeamMember {
    id
    level
    user {
      id
    }
  }
`);

function LevelSelect(props: {
  teamId: string;
  hasFineGrainedAccessControl: boolean;
  member: DocumentType<typeof _LevelSelectTeamMemberFragment>;
}) {
  const { member, hasFineGrainedAccessControl } = props;
  const [setTeamMemberLevel] = useMutation(SetTeamMemberLevelMutation);

  return (
    <MemberLevelSelect
      size="sm"
      className="text-low"
      hasFineGrainedAccessControl={hasFineGrainedAccessControl}
      selectedKey={member.level}
      onSelectionChange={(value) => {
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
      }}
    />
  );
}

function TeamMembersList(props: {
  team: DocumentType<typeof _TeamFragment>;
  amOwner: boolean;
  onRemove: (user: RemovedUser) => void;
  hasGithubSSO: boolean;
  hasFineGrainedAccessControl: boolean;
}) {
  const authPayload = useAssertAuthTokenPayload();
  const [search, setSearch] = useState("");
  const [source, setSource] = useState<Source>("everyone");
  const [orderBy, setOrderBy] = useState<TeamMembersOrderBy>(
    TeamMembersOrderBy.Date,
  );
  const filters = useMemo(
    () => ({ search, source, orderBy }),
    [search, source, orderBy],
  );
  const deferredFilters = useDeferredValue(filters);
  const { data, fetchMore } = useSuspenseQuery(TeamMembersQuery, {
    variables: {
      id: props.team.id,
      after: 0,
      first: INITIAL_NB_MEMBERS,
      search: deferredFilters.search,
      sso: { everyone: null, sso: true, invite: false }[deferredFilters.source],
      orderBy: deferredFilters.orderBy,
    },
  });
  const [isPending, startTransition] = useTransition();
  if (!data) {
    return null;
  }
  invariant(data.team?.__typename === "Team", "invalid team");
  const members = data.team.members.edges;
  const lastOne =
    !props.hasGithubSSO && data.team.members.pageInfo.totalCount === 1;
  return (
    <div className="my-4">
      <div className="mb-2 flex gap-2">
        <TextInputGroup className="w-full">
          <TextInputIcon>
            <SearchIcon />
          </TextInputIcon>
          <TextInput
            type="search"
            placeholder="Filter…"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />
        </TextInputGroup>
        <SourceSelect value={source} onChange={setSource} />
        <SortSelect value={orderBy} onChange={setOrderBy} />
      </div>
      {members.length > 0 ? (
        <List className={filters !== deferredFilters ? "opacity-disabled" : ""}>
          {members.map((member) => {
            const { user } = member;
            const isMe = authPayload.account.id === user.id;
            return (
              <UserListRow key={user.id} user={user}>
                {member.fromSSO ? (
                  <Chip icon={<MarkGithubIcon />} scale="sm" color="neutral">
                    SSO
                  </Chip>
                ) : null}
                {isMe || !props.amOwner ? (
                  <div className="text-low text-sm">
                    {TeamMemberLabel[member.level]}
                  </div>
                ) : (
                  <div>
                    <LevelSelect
                      teamId={props.team.id}
                      member={member}
                      hasFineGrainedAccessControl={
                        props.hasFineGrainedAccessControl
                      }
                    />
                  </div>
                )}
                {isMe || props.amOwner ? (
                  <RemoveMenu
                    isDisabled={lastOne || member.fromSSO}
                    tooltip={
                      isMe && lastOne
                        ? "You are the last user of this team, you can't leave it"
                        : member.fromSSO
                          ? "Disable GitHub SSO to remove this member"
                          : undefined
                    }
                    label="Member actions"
                    actionLabel={isMe ? "Leave Team" : "Remove from Team"}
                    onRemove={() => props.onRemove(user as RemovedUser)}
                  />
                ) : (
                  <div className="w-8" />
                )}
              </UserListRow>
            );
          })}
        </List>
      ) : (
        <EmptyState>
          <Heading>No members found</Heading>
          <Text slot="description">
            Your team has no members matching the current filters.
          </Text>
          <EmptyStateActions>
            <Button
              variant="secondary"
              onPress={() => {
                setSearch("");
                setSource("everyone");
                setOrderBy(TeamMembersOrderBy.Date);
              }}
              isPending={filters !== deferredFilters}
            >
              Clear filters
            </Button>
          </EmptyStateActions>
        </EmptyState>
      )}
      {data.team.members.pageInfo.hasNextPage && (
        <div className="pt-2">
          <Button
            variant="secondary"
            className="w-full justify-center"
            isPending={isPending}
            onPress={() => {
              startTransition(() => {
                fetchMore({
                  variables: {
                    after: members.length,
                    first: NB_MEMBERS_PER_PAGE,
                  },
                  updateQuery: (prev, { fetchMoreResult }) => {
                    if (!fetchMoreResult) {
                      return prev;
                    }
                    if (!fetchMoreResult.team) {
                      return prev;
                    }
                    if (!prev.team) {
                      return prev;
                    }
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

const _TeamGithubMembersListGithubAccountFragment = graphql(`
  fragment TeamGithubMembersList_GithubAccount on GithubAccount {
    id
    ...GithubAccountLink_GithubAccount
  }
`);

interface TeamGithubMembersListProps {
  teamId: string;
  teamName: string;
  amOwner: boolean;
  onRemove: (user: RemovedUser) => void;
  githubAccount: DocumentType<
    typeof _TeamGithubMembersListGithubAccountFragment
  >;
  hasFineGrainedAccessControl: boolean;
}

function TeamGithubMembersList(props: TeamGithubMembersListProps) {
  const { githubAccount } = props;
  const [showPendingMembers, setShowPendingMembers] = useState(false);
  return (
    <div className="my-4">
      <div className="flex items-center gap-2">
        <ListTitle className="flex-1">
          <MarkGithubIcon className="mr-1.5 inline-block size-4" />
          GitHub members synced from{" "}
          <GithubAccountLink githubAccount={githubAccount} />
        </ListTitle>
        <ShowPendingSwitch
          isSelected={showPendingMembers}
          onChange={setShowPendingMembers}
        />
      </div>
      <TeamGithubMembersFetchList
        {...props}
        showPendingMembers={showPendingMembers}
      />
    </div>
  );
}

interface TeamGithubMembersFetchListProps extends TeamGithubMembersListProps {
  showPendingMembers: boolean;
}

function TeamGithubMembersFetchList(props: TeamGithubMembersFetchListProps) {
  const authPayload = useAssertAuthTokenPayload();
  const { data, fetchMore } = useSuspenseQuery(TeamGithubMembersQuery, {
    variables: {
      id: props.teamId,
      after: 0,
      first: INITIAL_NB_MEMBERS,
      isTeamMember: !props.showPendingMembers,
    },
  });
  const [isPending, startTransition] = useTransition();
  if (!data) {
    return null;
  }
  invariant(data.team?.__typename === "Team", "Invalid team");
  if (!data.team.githubMembers) {
    return null;
  }
  const members = data.team.githubMembers.edges;
  return (
    <>
      <List>
        {members.map((member) => {
          const teamMember = member.teamMember ?? null;
          const user = teamMember?.user ?? null;
          const isMe = Boolean(user && authPayload.account.id === user.id);
          return (
            <ListRow
              key={member.id}
              className="flex items-center gap-6 px-4 py-2"
            >
              <AccountAvatar
                avatar={user?.avatar ?? member.githubAccount.avatar}
                className="size-9 shrink-0"
              />
              {user ? (
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <div className="text-sm font-semibold">{user.name}</div>
                  </div>
                  <div className="text-low text-xs">{user.slug}</div>
                </div>
              ) : (
                <div className="flex-1 text-sm font-semibold">
                  {member.githubAccount.login}
                </div>
              )}
              {isMe || !props.amOwner || !teamMember ? (
                <div className="text-low text-sm">
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
            variant="secondary"
            className="w-full justify-center"
            isPending={isPending}
            onPress={() => {
              startTransition(() => {
                fetchMore({
                  variables: {
                    after: members.length,
                    first: NB_MEMBERS_PER_PAGE,
                  },
                  updateQuery: (prev, { fetchMoreResult }) => {
                    if (!fetchMoreResult) {
                      return prev;
                    }
                    if (!fetchMoreResult.team) {
                      return prev;
                    }
                    if (!prev.team) {
                      return prev;
                    }
                    if (!prev.team.githubMembers) {
                      return prev;
                    }
                    if (!fetchMoreResult.team.githubMembers) {
                      return prev;
                    }
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
              });
            }}
          >
            Load more
          </Button>
        </div>
      )}
    </>
  );
}

function ShowPendingSwitch(props: {
  isSelected: boolean;
  onChange: (isSelected: boolean) => void;
}) {
  const { onChange, isSelected } = props;
  const id = useId();
  return (
    <div className="mb-2 flex select-none items-center gap-1.5 text-sm font-medium">
      <label htmlFor={id}>Show pending members</label>
      <Switch id={id} size="sm" onChange={onChange} isSelected={isSelected} />
    </div>
  );
}

export function TeamMembers(props: {
  team: DocumentType<typeof _TeamFragment>;
}) {
  const { team } = props;
  const authPayload = useAssertAuthTokenPayload();
  const [removedUser, setRemovedUser] = useState<RemovedUser | null>(null);
  const removeFromTeamModal = {
    isOpen: removedUser !== null,
    onOpenChange: (open: boolean) => {
      if (!open) {
        setRemovedUser(null);
      }
    },
  };
  const me = team.me;
  const amOwner =
    team.permissions.includes(AccountPermission.Admin) ||
    Boolean(me && me.level === TeamUserLevel.Owner);
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
        <Tabs>
          <TabList className="border-b">
            <Tab id="members">Members</Tab>
            <Tab id="pending">Pending invitations</Tab>
          </TabList>
          <TabPanel id="members">
            <TeamMembersList
              team={team}
              amOwner={amOwner}
              onRemove={setRemovedUser}
              hasGithubSSO={hasGithubSSO}
              hasFineGrainedAccessControl={hasFineGrainedAccessControl}
            />
          </TabPanel>
          <TabPanel id="pending">Pending</TabPanel>
        </Tabs>
        {/* {team.ssoGithubAccount && (
          <TeamGithubMembersList
            teamId={team.id}
            teamName={teamName}
            githubAccount={team.ssoGithubAccount}
            amOwner={amOwner}
            onRemove={setRemovedUser}
            hasFineGrainedAccessControl={hasFineGrainedAccessControl}
          />
        )} */}
        <Modal {...removeFromTeamModal}>
          {removedUser ? (
            authPayload.account.id === removedUser.id ? (
              <LeaveTeamDialog teamName={teamName} teamAccountId={team.id} />
            ) : (
              <RemoveFromTeamDialog
                teamName={teamName}
                teamAccountId={team.id}
                user={removedUser}
              />
            )
          ) : null}
        </Modal>
      </CardBody>
      <CardFooter className="flex items-center justify-between gap-4">
        {team.inviteLink ? (
          <>
            <div>Invite people to collaborate in the team.</div>
            <DialogTrigger>
              <Button variant="secondary">Invite</Button>
              <Modal>
                <InviteDialog team={team} />
              </Modal>
            </DialogTrigger>
          </>
        ) : (
          <>
            <div>Only a owners can invite people in the team.</div>
          </>
        )}
      </CardFooter>
    </Card>
  );
}
