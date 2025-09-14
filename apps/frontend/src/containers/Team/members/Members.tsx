import {
  useDeferredValue,
  useId,
  useMemo,
  useState,
  useTransition,
} from "react";
import { useMutation, useSuspenseQuery } from "@apollo/client";
import { invariant } from "@argos/util/invariant";
import { MarkGithubIcon } from "@primer/octicons-react";
import { SearchIcon } from "lucide-react";
import { Heading, TabPanel, Tabs, Text } from "react-aria-components";

import { AccountAvatar } from "@/containers/AccountAvatar";
import { useAssertAuthTokenPayload } from "@/containers/Auth";
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
import { DialogTrigger } from "@/ui/Dialog";
import { EmptyState, EmptyStateActions } from "@/ui/Layout";
import { List, ListRow, ListTitle } from "@/ui/List";
import { Modal } from "@/ui/Modal";
import { Switch } from "@/ui/Switch";
import { Tab, TabList } from "@/ui/Tab";
import { TextInput, TextInputGroup, TextInputIcon } from "@/ui/TextInput";
import { Tooltip } from "@/ui/Tooltip";

import { InviteDialog } from "./InviteDialog";
import { LeaveTeamDialog } from "./LeaveTeamDialog";
import type { MemberFilterUserLevel } from "./MemberLevelFilter";
import { MemberLevelFilter, MemberLevelSelect } from "./MemberLevelSelect";
import { RemoveFromTeamDialog, type RemovedUser } from "./RemoveFromTeamDialog";
import { SortFilter } from "./SortFilter";
import { SourceFilter, type Source } from "./SourceFilter";

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
    $levels: [TeamUserLevel!]
  ) {
    team: teamById(id: $id) {
      id
      members(
        first: $first
        after: $after
        search: $search
        sso: $sso
        orderBy: $orderBy
        levels: $levels
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
    $search: String
  ) {
    team: teamById(id: $id) {
      id
      githubMembers(
        first: $first
        after: $after
        isTeamMember: false
        search: $search
      ) {
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
  const [level, setLevel] = useState<MemberFilterUserLevel>("all");
  const [orderBy, setOrderBy] = useState<TeamMembersOrderBy>(
    TeamMembersOrderBy.Date,
  );
  const filters = useMemo(
    () => ({ search, source, orderBy, level }),
    [search, source, orderBy, level],
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
      levels: deferredFilters.level === "all" ? null : [deferredFilters.level],
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
        <MemberLevelFilter
          value={level}
          onChange={setLevel}
          hasFineGrainedAccessControl={props.hasFineGrainedAccessControl}
        />
        {props.hasGithubSSO ? (
          <SourceFilter value={source} onChange={setSource} />
        ) : null}
        <SortFilter value={orderBy} onChange={setOrderBy} />
      </div>
      {members.length > 0 ? (
        <List className={filters !== deferredFilters ? "opacity-disabled" : ""}>
          {members.map((member) => {
            const { user } = member;
            const isMe = authPayload.account.id === user.id;
            return (
              <UserListRow key={user.id} user={user}>
                {member.fromSSO ? (
                  <Tooltip content="This user is synced from GitHub SSO and cannot be removed until SSO is disabled.">
                    <Chip icon={<MarkGithubIcon />} scale="sm" color="neutral">
                      Synced
                    </Chip>
                  </Tooltip>
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
        <LoadMoreButton
          onPress={() => {
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
          }}
        />
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
  const authPayload = useAssertAuthTokenPayload();
  const [search, setSearch] = useState("");
  const deferredSearch = useDeferredValue(search);
  const { data, fetchMore } = useSuspenseQuery(TeamGithubMembersQuery, {
    variables: {
      id: props.teamId,
      after: 0,
      first: INITIAL_NB_MEMBERS,
      search: deferredSearch,
    },
  });
  if (!data) {
    return null;
  }
  invariant(data.team?.__typename === "Team", "Invalid team");
  if (!data.team.githubMembers) {
    return null;
  }
  const members = data.team.githubMembers.edges;
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
      </div>
      <List className={search !== deferredSearch ? "opacity-disabled" : ""}>
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
                    <Tooltip content="This user isn’t part of the team yet. If they log in with GitHub, they’ll be added automatically.">
                      <Chip scale="sm" color="neutral">
                        Pending
                      </Chip>
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
        <LoadMoreButton
          onPress={() => {
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
          }}
        />
      )}
    </div>
  );
}

function LoadMoreButton(props: { onPress: () => void }) {
  const [isPending, startTransition] = useTransition();
  return (
    <div className="pt-2">
      <Button
        variant="secondary"
        className="w-full justify-center"
        isPending={isPending}
        onPress={() => {
          startTransition(() => {
            props.onPress();
          });
        }}
      >
        Load more
      </Button>
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
            {team.ssoGithubAccount ? (
              <Tab id="pending-github-members">Pending GitHub Members</Tab>
            ) : null}
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
          {team.ssoGithubAccount ? (
            <TabPanel id="pending-github-members">
              <TeamGithubMembersList
                teamId={team.id}
                teamName={teamName}
                githubAccount={team.ssoGithubAccount}
                amOwner={amOwner}
                onRemove={setRemovedUser}
                hasFineGrainedAccessControl={hasFineGrainedAccessControl}
              />
            </TabPanel>
          ) : null}
          <TabPanel id="pending">Pending</TabPanel>
        </Tabs>
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
