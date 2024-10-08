import * as React from "react";
import { ApolloCache, Reference, useMutation } from "@apollo/client";
import { invariant } from "@argos/util/invariant";
import { useNavigate } from "react-router-dom";
import { useDebounce } from "use-debounce";

import { DocumentType, FragmentType, graphql, useFragment } from "@/gql";
import { ProjectPermission, ProjectUserLevel } from "@/gql/graphql";
import { Button } from "@/ui/Button";
import {
  Card,
  CardBody,
  CardFooter,
  CardParagraph,
  CardTitle,
} from "@/ui/Card";
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
import { getGraphQLErrorMessage } from "@/ui/Form";
import { FormError } from "@/ui/FormError";
import { Link } from "@/ui/Link";
import {
  List,
  ListEmpty,
  ListLoadMore,
  ListRowLoader,
  ListTitle,
} from "@/ui/List";
import {
  ListBox,
  ListBoxItem,
  ListBoxItemDescription,
  ListBoxItemLabel,
} from "@/ui/ListBox";
import { Loader } from "@/ui/Loader";
import { Modal } from "@/ui/Modal";
import { Popover } from "@/ui/Popover";
import { Select, SelectButton } from "@/ui/Select";
import { TextInput } from "@/ui/TextInput";

import { useQuery } from "../Apollo";
import { useAssertAuthTokenPayload } from "../Auth";
import {
  ProjectContributorLabel,
  RemoveMenu,
  TeamMemberLabel,
  UserListRow,
} from "../UserList";

const NB_MEMBERS_PER_PAGE = 10;

const ProjectContributedOnFragment = graphql(`
  fragment ProjectContributedOnFragment on User {
    projectsContributedOn(first: 1, projectId: $projectId) {
      edges {
        __typename
        id
        level
      }
    }
  }
`);

const OPTIMISTIC_CONTRIBUTOR_ID = "temp-id";

function addContributor(
  cache: ApolloCache<unknown>,
  data: {
    projectId: string;
    userId: string;
    contributor: {
      id: string;
      level: ProjectUserLevel;
    };
  },
) {
  if (data.contributor.id !== OPTIMISTIC_CONTRIBUTOR_ID) {
    cache.modify({
      id: cache.identify({
        __typename: "Project",
        id: data.projectId,
      }),
      fields: {
        contributors: (existingContributors, { readField }) => {
          const newContributor = {
            __typename: "ProjectContributor",
            id: data.contributor.id,
            level: data.contributor.level,
            user: {
              __ref: cache.identify({
                __typename: "User",
                id: data.userId,
              }),
            },
          };
          return {
            ...existingContributors,
            edges: [
              newContributor,
              ...existingContributors.edges.filter(
                (ref: Reference) => readField("id", ref) !== newContributor.id,
              ),
            ],
          };
        },
      },
    });
  }
  cache.writeFragment({
    id: cache.identify({ __typename: "User", id: data.userId }),
    fragment: ProjectContributedOnFragment,
    variables: { projectId: data.projectId },
    data: {
      projectsContributedOn: {
        __typename: "ProjectContributorConnection",
        edges: [
          {
            __typename: "ProjectContributor",
            ...data.contributor,
          },
        ],
      },
    },
  });
}

function removeContributor(
  cache: ApolloCache<unknown>,
  data: { projectId: string; userId: string; projectContributorId: string },
) {
  cache.modify({
    id: cache.identify({
      __typename: "Project",
      id: data.projectId,
    }),
    fields: {
      contributors: (existingContributors, { readField }) => {
        return {
          ...existingContributors,
          edges: existingContributors.edges.filter(
            (ref: Reference) =>
              readField("id", ref) !== data.projectContributorId,
          ),
        };
      },
    },
  });
  cache.writeFragment({
    id: cache.identify({ __typename: "User", id: data.userId }),
    fragment: ProjectContributedOnFragment,
    variables: {
      projectId: data.projectId,
    },
    data: {
      projectsContributedOn: {
        edges: [],
      },
    },
  });
}

const ProjectFragment = graphql(`
  fragment ProjectContributors_Project on Project {
    id
    name
    account {
      id
    }
    permissions
  }
`);

const ProjectContributorsQuery = graphql(`
  query ProjectContributorsQuery($projectId: ID!, $after: Int, $first: Int) {
    project: projectById(id: $projectId) {
      id
      contributors(after: $after, first: $first) {
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

const RemoveContributorFromProjectMutation = graphql(`
  mutation RemoveContributorFromProjectMutation(
    $projectId: ID!
    $userAccountId: ID!
  ) {
    removeContributorFromProject(
      input: { projectId: $projectId, userAccountId: $userAccountId }
    ) {
      projectContributorId
    }
  }
`);

const LeaveProjectDialog = React.memo(
  (props: {
    projectId: string;
    userAccountId: string;
    projectName: string;
  }) => {
    const state = useOverlayTriggerState();
    const navigate = useNavigate();
    const [leaveProject, { loading, error }] = useMutation(
      RemoveContributorFromProjectMutation,
      {
        variables: {
          projectId: props.projectId,
          userAccountId: props.userAccountId,
        },
        onCompleted() {
          state.close();
          navigate("/");
        },
      },
    );
    return (
      <Dialog size="medium">
        <DialogBody confirm>
          <DialogTitle>Remove me as contributor</DialogTitle>
          <DialogText>
            You are about to remove you as contributor of the project{" "}
            {props.projectName}. In order to be able to access it again, you
            will need to be added back by another project admin.
          </DialogText>
          <DialogText>Are you sure you want to continue?</DialogText>
        </DialogBody>
        <DialogFooter>
          {error && <FormError>{getGraphQLErrorMessage(error)}</FormError>}
          <DialogDismiss>Cancel</DialogDismiss>
          <Button
            isDisabled={loading}
            variant="destructive"
            onPress={() => {
              leaveProject().catch(() => {});
            }}
          >
            Remove me as contributor
          </Button>
        </DialogFooter>
      </Dialog>
    );
  },
);

// eslint-disable-next-line @typescript-eslint/no-unused-vars
const RemoveFromProjectDialogUserFragment = graphql(`
  fragment RemoveFromProjectDialog_User on User {
    id
    ...UserListRow_user
  }
`);

type RemovedUser = DocumentType<typeof RemoveFromProjectDialogUserFragment>;

const RemoveFromProjectDialog = React.memo(
  (props: { projectName: string; projectId: string; user: RemovedUser }) => {
    const state = useOverlayTriggerState();
    const [removeFromProject, { loading, error }] = useMutation(
      RemoveContributorFromProjectMutation,
      {
        onCompleted() {
          state.close();
        },
        update(cache, { data }) {
          if (data?.removeContributorFromProject) {
            removeContributor(cache, {
              projectId: props.projectId,
              userId: props.user.id,
              projectContributorId:
                data.removeContributorFromProject.projectContributorId,
            });
          }
        },
        variables: {
          projectId: props.projectId,
          userAccountId: props.user.id,
        },
      },
    );
    return (
      <Dialog size="medium">
        <DialogBody confirm>
          <DialogTitle>Remove Project contributor</DialogTitle>
          <DialogText>
            You are about to remove the following Project contributor, are you
            sure you want to continue?
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
            isDisabled={loading}
            variant="destructive"
            onPress={() => {
              removeFromProject().catch(() => {});
            }}
          >
            Remove from Project
          </Button>
        </DialogFooter>
      </Dialog>
    );
  },
);

function ProjectContributorsList(props: {
  projectId: string;
  projectName: string;
  readOnly: boolean;
}) {
  const authPayload = useAssertAuthTokenPayload();
  const [removedUser, setRemovedUser] = React.useState<RemovedUser | null>(
    null,
  );
  const removeModal = {
    isOpen: removedUser !== null,
    onOpenChange: (open: boolean) => {
      if (!open) {
        setRemovedUser(null);
      }
    },
  };
  const result = useQuery(ProjectContributorsQuery, {
    variables: {
      projectId: props.projectId,
      after: 0,
      first: NB_MEMBERS_PER_PAGE,
    },
  });
  return (
    <>
      <div className="my-4">
        <ListTitle>Project contributors</ListTitle>
        {(() => {
          if (!result.data) {
            return (
              <List>
                <ListRowLoader>Loading contributors...</ListRowLoader>
              </List>
            );
          }
          invariant(result.data.project, "Project not found");
          const contributors = result.data.project.contributors.edges;
          return (
            <>
              {contributors.length > 0 ? (
                <List>
                  {contributors.map((contributor) => {
                    const isMe = authPayload.account.id === contributor.user.id;
                    const user = contributor.user;
                    return (
                      <UserListRow key={contributor.id} user={user}>
                        <div>
                          {props.readOnly ? (
                            <div className="text-sm">
                              {ProjectContributorLabel[contributor.level]}
                            </div>
                          ) : (
                            <ProjectContributorLevelSelect
                              projectId={props.projectId}
                              userId={user.id}
                              level={contributor.level}
                            />
                          )}
                        </div>
                        {(isMe || !props.readOnly) && (
                          <RemoveMenu
                            label="Contributor actions"
                            actionLabel={
                              isMe ? "Leave Project" : "Remove from Project"
                            }
                            onRemove={() => setRemovedUser(user)}
                          />
                        )}
                      </UserListRow>
                    );
                  })}
                </List>
              ) : (
                <ListEmpty>There's no contributors yet.</ListEmpty>
              )}
              {result.data.project.contributors.pageInfo.hasNextPage && (
                <ListLoadMore
                  onPress={() => {
                    result.fetchMore({
                      variables: { after: contributors.length },
                      updateQuery: (prev, { fetchMoreResult }) => {
                        if (!fetchMoreResult?.project || !prev?.project) {
                          return prev;
                        }
                        return {
                          project: {
                            ...prev.project,
                            contributors: {
                              ...prev.project.contributors,
                              ...fetchMoreResult.project.contributors,
                              edges: [
                                ...prev.project.contributors.edges,
                                ...fetchMoreResult.project.contributors.edges,
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
      <Modal {...removeModal}>
        {removedUser ? (
          authPayload.account.id === removedUser.id ? (
            <LeaveProjectDialog
              projectId={props.projectId}
              projectName={props.projectName}
              userAccountId={removedUser.id}
            />
          ) : (
            <RemoveFromProjectDialog
              projectId={props.projectId}
              projectName={props.projectName}
              user={removedUser}
            />
          )
        ) : null}
      </Modal>
    </>
  );
}

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

const AddOrUpdateContributorMutation = graphql(`
  mutation ProjectAddOrUpdateContributorMutation(
    $projectId: ID!
    $userAccountId: ID!
    $level: ProjectUserLevel!
  ) {
    addOrUpdateProjectContributor(
      input: {
        projectId: $projectId
        userAccountId: $userAccountId
        level: $level
      }
    ) {
      id
      level
    }
  }
`);

function ProjectContributorLevelSelect(props: {
  projectId: string;
  userId: string;
  level: ProjectUserLevel | "";
}) {
  const [addOrUpdateContributor] = useMutation(AddOrUpdateContributorMutation);

  return (
    <Select
      aria-label="Levels"
      selectedKey={props.level}
      onSelectionChange={(value) => {
        invariant(typeof value === "string");
        addOrUpdateContributor({
          variables: {
            projectId: props.projectId,
            userAccountId: props.userId,
            level: value as ProjectUserLevel,
          },
          optimisticResponse: {
            addOrUpdateProjectContributor: {
              __typename: "ProjectContributor",
              id: OPTIMISTIC_CONTRIBUTOR_ID,
              level: value as ProjectUserLevel,
            },
          },
          update: (cache, { data }) => {
            if (data?.addOrUpdateProjectContributor) {
              addContributor(cache, {
                projectId: props.projectId,
                userId: props.userId,
                contributor: data.addOrUpdateProjectContributor,
              });
            }
          },
        });
      }}
    >
      <SelectButton className="text-low w-full text-sm">
        {props.level ? ProjectContributorLabel[props.level] : "Add as"}
      </SelectButton>

      <Popover>
        <ListBox>
          <ListBoxItem id="viewer" textValue={ProjectContributorLabel.viewer}>
            <ListBoxItemLabel>
              {ProjectContributorLabel.viewer}
            </ListBoxItemLabel>
            <ListBoxItemDescription>
              See builds and screenshots
            </ListBoxItemDescription>
          </ListBoxItem>
          <ListBoxItem
            id="reviewer"
            textValue={ProjectContributorLabel.reviewer}
          >
            <ListBoxItemLabel>
              {ProjectContributorLabel.reviewer}
            </ListBoxItemLabel>
            <ListBoxItemDescription>
              See and review builds
            </ListBoxItemDescription>
          </ListBoxItem>
          <ListBoxItem id="admin" textValue={ProjectContributorLabel.admin}>
            <ListBoxItemLabel>{ProjectContributorLabel.admin}</ListBoxItemLabel>
            <ListBoxItemDescription>
              Admin level access to the entire project
            </ListBoxItemDescription>
          </ListBoxItem>
        </ListBox>
      </Popover>
    </Select>
  );
}

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
  const [search, setSearch] = React.useState("");
  const [debouncedSearch] = useDebounce(search, 300);
  const searchInputRef = React.useRef<HTMLInputElement>(null);
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

  React.useEffect(() => {
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

function ProjectContributorsAdd(props: {
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

function TeamMembersList(props: { projectId: string; teamAccountId: string }) {
  const result = useQuery(TeamMembersQuery, {
    variables: {
      teamAccountId: props.teamAccountId,
      after: 0,
      first: NB_MEMBERS_PER_PAGE,
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
              <ListRowLoader>Loading team members...</ListRowLoader>
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
                      {ProjectContributorLabel.admin}
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

export function ProjectContributors(props: {
  project: FragmentType<typeof ProjectFragment>;
}) {
  const project = useFragment(ProjectFragment, props.project);
  const hasAdminPermission = project.permissions.includes(
    ProjectPermission.Admin,
  );
  return (
    <Card>
      <CardBody>
        <CardTitle>Access management</CardTitle>
        <CardParagraph>
          Select which team members can access this project and determine their
          level of access.
        </CardParagraph>
        <ProjectContributorsList
          readOnly={!hasAdminPermission}
          projectId={project.id}
          projectName={project.name}
        />
        <TeamMembersList
          projectId={project.id}
          teamAccountId={project.account.id}
        />
      </CardBody>
      <CardFooter className="flex items-center justify-between">
        {hasAdminPermission ? (
          <>
            <div>
              Learn more about{" "}
              <Link
                href="https://argos-ci.com/docs/team-members-and-roles"
                target="_blank"
              >
                access control management
              </Link>
              .
            </div>
            <ProjectContributorsAdd
              projectId={project.id}
              teamAccountId={project.account.id}
            />
          </>
        ) : (
          <div>
            Only a project admin add contributor or change access level.
          </div>
        )}
      </CardFooter>
    </Card>
  );
}
