import { useDeferredValue, useMemo, useState } from "react";
import { useSuspenseQuery } from "@apollo/client";
import { invariant } from "@argos/util/invariant";
import { MarkGithubIcon } from "@primer/octicons-react";
import { Heading, Text } from "react-aria-components";

import { useAssertAuthTokenPayload } from "@/containers/Auth";
import {
  RemoveMenu,
  TeamMemberLabel,
  UserListRow,
} from "@/containers/UserList";
import { graphql } from "@/gql";
import { TeamMembersOrderBy } from "@/gql/graphql";
import { Button } from "@/ui/Button";
import { Chip } from "@/ui/Chip";
import { EmptyState, EmptyStateActions } from "@/ui/Layout";
import { List, ListLoadMore } from "@/ui/List";
import { Tooltip } from "@/ui/Tooltip";

import { MemberLevelEditor } from "./MemberLevelEditor";
import { MemberLevelFilter, type FilterUserLevel } from "./MemberLevelFilter";
import { type RemovedUser } from "./RemoveFromTeamDialog";
import { SearchFilter } from "./SearchFilter";
import { SortFilter } from "./SortFilter";
import { SourceFilter, type Source } from "./SourceFilter";

const INITIAL_NB_MEMBERS = 10;
const NB_MEMBERS_PER_PAGE = 100;

const TeamMembersQuery = graphql(`
  query MembersList_teamMembers(
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
          ...MemberLevelEditor_TeamMember
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

interface TeamMembersListProps {
  teamId: string;
  amOwner: boolean;
  onRemove: (user: RemovedUser) => void;
  hasGithubSSO: boolean;
  hasFineGrainedAccessControl: boolean;
}

export function TeamMembersList(props: TeamMembersListProps) {
  const authPayload = useAssertAuthTokenPayload();
  const [search, setSearch] = useState("");
  const [source, setSource] = useState<Source>("everyone");
  const [level, setLevel] = useState<FilterUserLevel>("all");
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
      id: props.teamId,
      after: 0,
      first: INITIAL_NB_MEMBERS,
      search: deferredFilters.search,
      sso: { everyone: null, sso: true, invite: false }[deferredFilters.source],
      orderBy: deferredFilters.orderBy,
      levels: deferredFilters.level === "all" ? null : [deferredFilters.level],
    },
  });
  if (!data) {
    return null;
  }
  invariant(data.team?.__typename === "Team", "invalid team");
  const members = data.team.members.edges;
  const lastOne =
    !props.hasGithubSSO && data.team.members.pageInfo.totalCount === 1;
  return (
    <div>
      <div aria-label="Filters" className="mb-2 flex gap-2">
        <SearchFilter value={search} onChange={setSearch} />
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
                    <MemberLevelEditor
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
            >
              Clear filters
            </Button>
          </EmptyStateActions>
        </EmptyState>
      )}
      {data.team.members.pageInfo.hasNextPage && (
        <ListLoadMore
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
