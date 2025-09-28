import { useDeferredValue, useState } from "react";
import { useSuspenseQuery } from "@apollo/client/react";
import { invariant } from "@argos/util/invariant";
import { Heading, Text } from "react-aria-components";

import { AccountAvatar } from "@/containers/AccountAvatar";
import { useAssertAuthTokenPayload } from "@/containers/Auth";
import { TeamMemberLabel } from "@/containers/UserList";
import { DocumentType, graphql } from "@/gql";
import { Button } from "@/ui/Button";
import { Chip } from "@/ui/Chip";
import { EmptyState, EmptyStateActions } from "@/ui/Layout";
import { List, ListLoadMore, ListRow } from "@/ui/List";
import { Tooltip } from "@/ui/Tooltip";

import { MemberLevelEditor } from "./MemberLevelEditor";
import type { RemovedUser } from "./RemoveFromTeamDialog";
import { SearchFilter } from "./SearchFilter";

const INITIAL_NB_MEMBERS = 10;
const NB_MEMBERS_PER_PAGE = 100;

const TeamGithubMembersQuery = graphql(`
  query GitHubMembersList_githubMembers(
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
            ...MemberLevelEditor_TeamMember
          }
        }
        pageInfo {
          hasNextPage
        }
      }
    }
  }
`);

const _GithubAccountFragment = graphql(`
  fragment GitHubMembersList_GithubAccount on GithubAccount {
    id
    ...GithubAccountLink_GithubAccount
  }
`);

interface TeamGithubMembersListProps {
  teamId: string;
  teamName: string;
  amOwner: boolean;
  onRemove: (user: RemovedUser) => void;
  githubAccount: DocumentType<typeof _GithubAccountFragment>;
  hasFineGrainedAccessControl: boolean;
}

export function TeamGithubMembersList(props: TeamGithubMembersListProps) {
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
    <div>
      <div aria-label="Filters" className="mb-2 flex gap-2">
        <SearchFilter value={search} onChange={setSearch} />
      </div>
      {members.length > 0 ? (
        <List className={search !== deferredSearch ? "opacity-disabled" : ""}>
          {members.map((member) => {
            const teamMember = member.teamMember ?? null;
            const user = teamMember?.user ?? null;
            const isMe = Boolean(user && authPayload.account.id === user.id);
            return (
              <ListRow
                key={member.id}
                className="flex items-center gap-4 px-4 py-2"
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
                    <MemberLevelEditor
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
      ) : deferredSearch !== "" ? (
        <EmptyState>
          <Heading>No GitHub members found</Heading>
          <Text slot="description">
            Your team has no members matching the current search.
          </Text>
          <EmptyStateActions>
            <Button
              variant="secondary"
              onPress={() => {
                setSearch("");
              }}
            >
              Clear search
            </Button>
          </EmptyStateActions>
        </EmptyState>
      ) : (
        <EmptyState>
          <Heading>No GitHub members found</Heading>
          <Text slot="description">
            There are no GitHub members in your organization.
          </Text>
        </EmptyState>
      )}
      {data.team.githubMembers.pageInfo.hasNextPage && (
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
