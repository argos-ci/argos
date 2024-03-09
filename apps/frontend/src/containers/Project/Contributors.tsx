import * as React from "react";

import { DocumentType, FragmentType, graphql, useFragment } from "@/gql";
import {
  Card,
  CardBody,
  CardFooter,
  CardParagraph,
  CardTitle,
} from "@/ui/Card";
import { useQuery } from "../Apollo";
import { invariant } from "@/util/invariant";
import { List, ListEmpty, ListLoadMore } from "@/ui/List";
import { Button } from "@/ui/Button";
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
import { ApolloCache, Reference, useMutation } from "@apollo/client";
import {
  Select,
  SelectArrow,
  SelectItem,
  SelectPopover,
  useSelectState,
} from "@/ui/Select";
import { ProjectPermission, ProjectUserLevel } from "@/gql/graphql";
import { RemoveMenu, UserListRow } from "../UserList";
import { useAssertAuthTokenPayload } from "../Auth";
import { useNavigate } from "react-router-dom";
import { FormError } from "@/ui/FormError";
import { getGraphQLErrorMessage } from "@/ui/Form";
import { Loader } from "@/ui/Loader";
import { TextInput } from "@/ui/TextInput";
import { useDebounce } from "use-debounce";

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
    state: DialogState;
  }) => {
    const [leaveProject, { loading, error }] = useMutation(
      RemoveContributorFromProjectMutation,
      {
        variables: {
          projectId: props.projectId,
          userAccountId: props.userAccountId,
        },
        onCompleted() {
          props.state.hide();
          navigate("/");
        },
      },
    );
    const navigate = useNavigate();
    return (
      <>
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
            disabled={loading}
            color="danger"
            onClick={() => {
              leaveProject().catch(() => {});
            }}
          >
            Remove me as contributor
          </Button>
        </DialogFooter>
      </>
    );
  },
);

const RemoveFromProjectDialogUserFragment = graphql(`
  fragment RemoveFromProjectDialog_User on User {
    id
    ...UserListRow_user
  }
`);

type RemovedUser = DocumentType<typeof RemoveFromProjectDialogUserFragment>;

const RemoveFromProjectDialog = React.memo(
  (props: {
    state: DialogState;
    projectName: string;
    projectId: string;
    user: RemovedUser;
  }) => {
    const [removeFromProject, { loading, error }] = useMutation(
      RemoveContributorFromProjectMutation,
      {
        onCompleted() {
          props.state.hide();
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
      <>
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
            disabled={loading}
            color="danger"
            onClick={() => {
              removeFromProject().catch(() => {});
            }}
          >
            Remove from Project
          </Button>
        </DialogFooter>
      </>
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
  const removeDialog = useDialogState({
    open: removedUser !== null,
    setOpen: (open) => {
      if (!open) {
        setRemovedUser(null);
      }
    },
  });
  const { data, fetchMore } = useQuery(ProjectContributorsQuery, {
    variables: {
      projectId: props.projectId,
      after: 0,
      first: NB_MEMBERS_PER_PAGE,
    },
  });
  if (!data) {
    return null;
  }
  invariant(data.project, "Project not found");
  const contributors = data.project.contributors.edges;
  return (
    <>
      <div className="my-4">
        {contributors.length > 0 ? (
          <List>
            {contributors.map((contributor) => {
              const isMe = authPayload.account.id === contributor.user.id;
              const user = contributor.user;
              return (
                <UserListRow key={contributor.id} user={user}>
                  <div>
                    {props.readOnly ? (
                      projectUserLevelLabel[contributor.level]
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
          <ListEmpty>You haven't added any contributors yet.</ListEmpty>
        )}
        {data.project.contributors.pageInfo.hasNextPage && (
          <ListLoadMore
            onClick={() => {
              fetchMore({
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
      </div>
      <Dialog state={removeDialog}>
        {removedUser ? (
          authPayload.account.id === removedUser.id ? (
            <LeaveProjectDialog
              projectId={props.projectId}
              projectName={props.projectName}
              userAccountId={removedUser.id}
              state={removeDialog}
            />
          ) : (
            <RemoveFromProjectDialog
              projectId={props.projectId}
              projectName={props.projectName}
              user={removedUser}
              state={removeDialog}
            />
          )
        ) : null}
      </Dialog>
    </>
  );
}

const TeamContributorsQuery = graphql(`
  query TeamContributorsQuery(
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
        userLevel: contributor
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

const projectUserLevelLabel: Record<ProjectUserLevel, string> = {
  admin: "Admin",
  viewer: "Viewer",
  reviewer: "Reviewer",
};

function ProjectContributorLevelSelect(props: {
  projectId: string;
  userId: string;
  level: ProjectUserLevel | "";
}) {
  const [addOrUpdateContributor] = useMutation(AddOrUpdateContributorMutation);
  const select = useSelectState({
    gutter: 4,
    value: props.level,
    setValue: (value) => {
      addOrUpdateContributor({
        variables: {
          projectId: props.projectId,
          userAccountId: props.userId,
          level: value as ProjectUserLevel,
        },
        optimisticResponse: {
          addOrUpdateProjectContributor: {
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
    },
  });

  const value = select.value as ProjectUserLevel;

  return (
    <>
      <Select state={select} className="w-full text-sm text-low">
        <div className="flex w-full items-center justify-between gap-2">
          {value ? projectUserLevelLabel[value] : "Add as"}
          <SelectArrow />
        </div>
      </Select>

      <SelectPopover state={select} aria-label="Levels" portal>
        <SelectItem state={select} value="viewer">
          <div className="flex flex-col">
            <div>{projectUserLevelLabel.viewer}</div>
            <div className="text-low">See builds</div>
          </div>
        </SelectItem>
        <SelectItem state={select} value="reviewer">
          <div className="flex flex-col">
            <div>{projectUserLevelLabel.reviewer}</div>
            <div className="text-low">Review builds</div>
          </div>
        </SelectItem>
        <SelectItem state={select} value="admin">
          <div className="flex flex-col">
            <div>{projectUserLevelLabel.admin}</div>
            <div className="text-low">
              Admin level access to the entire project
            </div>
          </div>
        </SelectItem>
      </SelectPopover>
    </>
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

  React.useEffect(() => {
    if (!loading) {
      invariant(searchInputRef.current);
      searchInputRef.current.focus();
    }
  }, [loading]);

  return (
    <div className="my-4 h-60 flex flex-col">
      <div className="relative">
        <TextInput
          ref={searchInputRef}
          type="search"
          placeholder="Search for a team member"
          className="w-full mb-2 search-cancel:appearance-none"
          disabled={loading}
          onChange={(e) => setSearch(e.target.value)}
        />
        {result.loading && (
          <Loader size={16} delay={0} className="absolute right-2.5 top-2.5" />
        )}
      </div>
      <div className="flex-1 overflow-auto">
        {(() => {
          if (loading) {
            return <Loader size={32} className="mt-4 mx-auto" />;
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
                        There's no member with the role contributor in this team
                        yet.
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
                  onClick={() => {
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
  const dialog = useDialogState();
  return (
    <>
      <DialogDisclosure state={dialog}>
        {(disclosureProps) => (
          <Button {...disclosureProps} color="neutral" variant="outline">
            Add contributor
          </Button>
        )}
      </DialogDisclosure>
      <Dialog state={dialog}>
        <DialogBody>
          <DialogTitle>Add contributor</DialogTitle>
          <DialogText>
            Find a team member by their username or email address to give them
            access to this project.
          </DialogText>
          {dialog.open && (
            <TeamContributorsList
              projectId={props.projectId}
              teamAccountId={props.teamAccountId}
            />
          )}
        </DialogBody>
        <DialogFooter>
          <DialogDismiss single>Close</DialogDismiss>
        </DialogFooter>
      </Dialog>
    </>
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
        <CardTitle>Contributors</CardTitle>
        <CardParagraph>
          Give access to this project to your team members.
        </CardParagraph>
        <ProjectContributorsList
          readOnly={!hasAdminPermission}
          projectId={project.id}
          projectName={project.name}
        />
      </CardBody>
      <CardFooter className="flex items-center justify-between">
        {hasAdminPermission ? (
          <>
            <div>Add team contributors to give access to this project.</div>
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
