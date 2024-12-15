import { useEffect, useRef, useState } from "react";
import { invariant } from "@argos/util/invariant";
import { useDebounce } from "use-debounce";

import { useQuery } from "@/containers/Apollo";
import { UserListRow } from "@/containers/UserList";
import { FragmentType, graphql, useFragment } from "@/gql";
import { Button } from "@/ui/Button";
import {
  Dialog,
  DialogBody,
  DialogDismiss,
  DialogFooter,
  DialogText,
  DialogTitle,
  DialogTrigger,
} from "@/ui/Dialog";
import { List, ListEmpty, ListLoadMore } from "@/ui/List";
import { Loader } from "@/ui/Loader";
import { Modal } from "@/ui/Modal";
import { TextInput } from "@/ui/TextInput";

import { ProjectContributorLevelSelect } from "./ProjectContributorLevelSelect";

const NB_MEMBERS_PER_PAGE = 10;

const TeamContributorsQuery = graphql(`
  query ProjectContributors_TeamContributors(
    $teamAccountId: ID!
    $projectId: ID!
    $search: String
    $after: Int
    $first: Int
  ) {
    team: teamById(id: $teamAccountId) {
      id
      members(
        after: $after
        first: $first
        levels: [contributor]
        search: $search
      ) {
        edges {
          id
          user {
            id
            ...ContributorListRow_user
          }
        }
        pageInfo {
          hasNextPage
        }
      }
    }
  }
`);

const ContributorListRowFragment = graphql(`
  fragment ContributorListRow_user on User {
    id
    projectsContributedOn(first: 1, projectId: $projectId) {
      edges {
        id
        level
      }
    }
    ...UserListRow_user
  }
`);

function ContributorListRow(props: {
  projectId: string;
  user: FragmentType<typeof ContributorListRowFragment>;
}) {
  const user = useFragment(ContributorListRowFragment, props.user);
  const contributor = user.projectsContributedOn.edges[0] ?? null;
  return (
    <UserListRow user={user}>
      <div>
        <ProjectContributorLevelSelect
          projectId={props.projectId}
          userId={user.id}
          level={contributor?.level ?? ""}
        />
      </div>
    </UserListRow>
  );
}

function TeamContributorsList(props: {
  projectId: string;
  teamAccountId: string;
}) {
  const [search, setSearch] = useState("");
  const [debouncedSearch] = useDebounce(search, 300);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const result = useQuery(TeamContributorsQuery, {
    variables: {
      projectId: props.projectId,
      teamAccountId: props.teamAccountId,
      after: 0,
      first: NB_MEMBERS_PER_PAGE,
      search: debouncedSearch,
    },
  });

  const data = result.data || result.previousData;
  const loading = !data;
  const noContributors = data?.team?.members.edges.length === 0 && !search;

  useEffect(() => {
    if (!loading) {
      invariant(searchInputRef.current);
      searchInputRef.current.focus();
    }
  }, [loading]);

  return (
    <div className="my-4 flex h-60 flex-col">
      <div className="relative">
        <TextInput
          ref={searchInputRef}
          type="search"
          placeholder="Search for a team member"
          className="search-cancel:appearance-none mb-2 w-full"
          disabled={loading || noContributors}
          onChange={(e) => setSearch(e.target.value)}
        />
        {result.loading && (
          <Loader size={16} delay={0} className="absolute right-2.5 top-2.5" />
        )}
      </div>
      <div className="flex-1 overflow-auto">
        {(() => {
          if (loading) {
            return <Loader size={32} className="mx-auto mt-4" />;
          }
          invariant(data.team, "Team not found");
          const members = data.team.members.edges;

          return (
            <>
              {(() => {
                if (members.length === 0) {
                  if (!search) {
                    return (
                      <ListEmpty>
                        There's no user with the "contributor" role in the team.
                        Only team members with the "contributor" role can be
                        added as contributors to the project. Others
                        automatically get access to all projects.
                      </ListEmpty>
                    );
                  }
                  return <ListEmpty>No results found.</ListEmpty>;
                }

                return (
                  <List>
                    {members.map((member) => {
                      const user = member.user;
                      return (
                        <ContributorListRow
                          key={user.id}
                          user={user}
                          projectId={props.projectId}
                        />
                      );
                    })}
                  </List>
                );
              })()}
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
    </div>
  );
}

export function ProjectContributorsAdd(props: {
  projectId: string;
  teamAccountId: string;
}) {
  return (
    <DialogTrigger>
      <Button variant="secondary">Add contributor</Button>
      <Modal>
        <Dialog size="medium">
          <DialogBody>
            <DialogTitle>Add contributor</DialogTitle>
            <DialogText>
              Find a team member by their username or email address to give them
              access to this project.
            </DialogText>
            <TeamContributorsList
              projectId={props.projectId}
              teamAccountId={props.teamAccountId}
            />
          </DialogBody>
          <DialogFooter>
            <DialogDismiss single>Close</DialogDismiss>
          </DialogFooter>
        </Dialog>
      </Modal>
    </DialogTrigger>
  );
}
