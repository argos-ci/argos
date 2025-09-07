import { invariant } from "@argos/util/invariant";

import { useSafeQuery } from "@/containers/Apollo";
import { ProjectContributorLevelLabel } from "@/containers/ProjectContributor";
import { TeamMemberLabel, UserListRow } from "@/containers/UserList";
import { graphql } from "@/gql";
import { List, ListLoadMore, ListRowLoader, ListTitle } from "@/ui/List";

const TeamMembersQuery = graphql(`
  query ProjectContributors_TeamMembers(
    $teamAccountId: ID!
    $search: String
    $after: Int
    $first: Int
  ) {
    team: teamById(id: $teamAccountId) {
      id
      members(
        after: $after
        first: $first
        levels: [owner, member]
        search: $search
      ) {
        edges {
          id
          level
          user {
            id
            ...UserListRow_user
          }
        }
        pageInfo {
          hasNextPage
        }
      }
    }
  }
`);

export function ProjectTeamMembersList(props: {
  projectId: string;
  teamAccountId: string;
}) {
  const result = useSafeQuery(TeamMembersQuery, {
    variables: {
      teamAccountId: props.teamAccountId,
      after: 0,
      first: 10,
    },
  });
  const data = result.data || result.previousData;
  const loading = !data;

  return (
    <div className="my-4">
      <ListTitle>Team members with global access</ListTitle>
      {(() => {
        if (loading) {
          return (
            <List>
              <ListRowLoader>Loading team members…</ListRowLoader>
            </List>
          );
        }
        invariant(data.team, "Team not found");
        const members = data.team.members.edges;

        return (
          <>
            <List>
              {members.map((member) => {
                const user = member.user;
                return (
                  <UserListRow key={user.id} user={user}>
                    <div className="text-sm">
                      Team {TeamMemberLabel[member.level]} → Project{" "}
                      {ProjectContributorLevelLabel.admin}
                    </div>
                  </UserListRow>
                );
              })}
            </List>
            {data.team.members.pageInfo.hasNextPage && (
              <ListLoadMore
                onPress={() => {
                  result.fetchMore({
                    variables: {
                      after: members.length,
                    },
                    updateQuery: (prev, { fetchMoreResult }) => {
                      if (!fetchMoreResult?.team || !prev?.team) {
                        return prev;
                      }
                      return {
                        team: {
                          ...prev.team,
                          members: {
                            ...prev.team.members,
                            ...fetchMoreResult.team.members,
                            edges: [
                              ...prev.team.members.edges,
                              ...fetchMoreResult.team.members.edges,
                            ],
                          },
                        },
                      };
                    },
                  });
                }}
              />
            )}
          </>
        );
      })()}
    </div>
  );
}
