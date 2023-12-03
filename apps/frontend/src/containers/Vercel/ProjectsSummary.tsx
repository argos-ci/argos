import { useMutation } from "@apollo/client";
import {
  CheckCircle2Icon,
  CircleEllipsisIcon,
  AlertCircleIcon,
} from "lucide-react";

import { MarkGithubIcon } from "@primer/octicons-react";
import { useEffect } from "react";

import config from "@/config";
import { graphql } from "@/gql";
import { VercelApiProjectStatus } from "@/gql/graphql";
import { Button, ButtonIcon } from "@/ui/Button";
import { Anchor } from "@/ui/Link";
import { List, ListRow } from "@/ui/List";
import { PageLoader } from "@/ui/PageLoader";

import { useQuery } from "../Apollo";
import { VercelAccountContext } from "./Router";
import { AuthenticationError } from "../Auth";

const VercelProjectsQuery = graphql(`
  query VercelProjectsSummary_me_vercelApiProjects(
    $teamId: ID
    $accessToken: String!
    $accountId: ID!
  ) {
    me {
      id
      ghInstallations {
        pageInfo {
          totalCount
        }
      }
    }
    vercelApiProjects(teamId: $teamId, accessToken: $accessToken, limit: 100) {
      projects {
        id
        name
        status(accountId: $accountId)
        linkedProject {
          id
        }
        link {
          __typename
          type
          ... on VercelApiProjectLinkGithub {
            org
            repo
            repoId
          }
        }
      }
    }
  }
`);

const ImportGithubProjectMutation = graphql(`
  mutation VercelProjectsSummary_importGithubProject(
    $repo: String!
    $owner: String!
    $accountSlug: String!
  ) {
    importGithubProject(
      input: { repo: $repo, owner: $owner, accountSlug: $accountSlug }
    ) {
      id
      name
      account {
        id
        slug
      }
    }
  }
`);

const CompleteSetupMutation = graphql(`
  mutation VercelProjectsSummary_setupVercelIntegration(
    $input: SetupVercelIntegrationInput!
  ) {
    setupVercelIntegration(input: $input)
  }
`);

type SyncProjectProps = {
  org: string;
  repo: string;
  accountSlug: string;
  onSynced: (projectId: string) => void;
  onError: () => void;
};

const SyncProject = (props: SyncProjectProps) => {
  const [importGithubProject, { error }] = useMutation(
    ImportGithubProjectMutation,
    {
      variables: {
        repo: props.repo,
        owner: props.org,
        accountSlug: props.accountSlug,
      },
      onCompleted(data) {
        props.onSynced(data.importGithubProject.id);
      },
      onError() {
        props.onError();
      },
    },
  );

  useEffect(() => {
    importGithubProject();
  }, [importGithubProject]);

  if (error) {
    return (
      <div className="flex items-center gap-1">
        <AlertCircleIcon className="h-4 w-4 text-red-500" />
        Error while syncing
      </div>
    );
  }

  return (
    <div className="flex items-center gap-1">
      <CircleEllipsisIcon className="h-4 w-4 text-blue-500" />
      Syncing...
    </div>
  );
};

export const ProjectsSummary = (props: { ctx: VercelAccountContext }) => {
  const { data, updateQuery } = useQuery(VercelProjectsQuery, {
    variables: {
      accessToken: props.ctx.accessToken,
      teamId: props.ctx.teamId,
      accountId: props.ctx.linkedAccount.id,
    },
  });
  const [
    completeSetup,
    { loading: completing, error: completeError, data: completeData },
  ] = useMutation(CompleteSetupMutation, {
    onCompleted() {
      window.location.replace(props.ctx.next);
    },
  });

  const completed = Boolean(completeData);

  if (completeError) {
    throw completeError;
  }

  if (!data) {
    return <PageLoader />;
  }

  if (!data.me) {
    throw new AuthenticationError("User not connected");
  }

  const syncingProject = data.vercelApiProjects.projects.find(
    (project) => project.status === "READY_FOR_LINK",
  );
  const requireGithubAccessCount = data.vercelApiProjects.projects.filter(
    (project) => project.status === "REQUIRE_GITHUB_ACCESS",
  ).length;
  const linkedProjects = data.vercelApiProjects.projects.filter(
    (project) => project.status === "LINKED" && project.linkedProject,
  );

  const completeSetupWithVariables = () => {
    completeSetup({
      variables: {
        input: {
          accountId: props.ctx.linkedAccount.id,
          vercelAccessToken: props.ctx.accessToken,
          vercelConfigurationId: props.ctx.configurationId,
          vercelTeamId: props.ctx.teamId,
          projects: linkedProjects.map((project) => {
            if (!project.linkedProject) {
              throw new Error("Invariant: project.linkedProject is null");
            }
            return {
              vercelProjectId: project.id,
              projectId: project.linkedProject.id,
            };
          }),
        },
      },
    });
  };

  if (data.me.ghInstallations.pageInfo.totalCount === 0) {
    return (
      <div className="" style={{ maxWidth: 400 }}>
        <p className="mb-6">
          Argos needs access to your Git repositories history to find a
          comparison base for your deployments.
        </p>
        <p>
          In the next step, you will be asked to select the GitHub account you
          want to sync with.{" "}
          <strong>
            Be sure to select all the repositories linked to Vercel.
          </strong>
        </p>
        <div className="mt-10 text-center">
          <Button color="neutral" size="large" className="w-80 justify-center">
            {(buttonProps) => (
              <a
                href={`${config.get(
                  "github.appUrl",
                )}/installations/new?state=${encodeURIComponent(
                  window.location.pathname + window.location.search,
                )}`}
                {...buttonProps}
              >
                <ButtonIcon>
                  <MarkGithubIcon />
                </ButtonIcon>
                Install Argos App on GitHub
              </a>
            )}
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div>
      <p className="mb-6 text-center text-low">
        Vercel projects are automatically synced with Argos.
      </p>
      <List style={{ maxHeight: 400 }} className="w-full overflow-auto">
        {data.vercelApiProjects.projects.map((project) => {
          return (
            <ListRow key={project.id} className="px-4 py-2">
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <div className="text-sm font-semibold">{project.name}</div>
                </div>
                {project.link && (
                  <div className="text-xs text-low">{project.link.type}</div>
                )}
              </div>
              <div className="text-sm font-semibold">
                {(() => {
                  switch (project.status) {
                    case VercelApiProjectStatus.Linked:
                      return (
                        <div className="flex items-center gap-1">
                          <CheckCircle2Icon className="h-4 w-4 text-success-500" />
                          Ready
                        </div>
                      );
                    case VercelApiProjectStatus.LinkedToOtherTeam:
                      return (
                        <div className="flex items-center gap-1">
                          <AlertCircleIcon className="h-4 w-4 text-warning-500" />
                          Linked to another team
                        </div>
                      );
                    case VercelApiProjectStatus.RequireGithubAccess:
                      return (
                        <div className="flex items-center gap-1">
                          <AlertCircleIcon className="h-4 w-4 text-warning-500" />
                          Require GitHub Access
                        </div>
                      );
                    case VercelApiProjectStatus.ReadyForLink: {
                      if (
                        !project.link ||
                        project.link.__typename !==
                          "VercelApiProjectLinkGithub" ||
                        !project.link.org ||
                        !project.link.repo
                      ) {
                        throw new Error("Invariant: unexpected project link");
                      }
                      const isSyncing = syncingProject?.id === project.id;
                      if (isSyncing) {
                        const updateProject = (input: {
                          status: VercelApiProjectStatus;
                          linkedProject: {
                            __typename: "Project";
                            id: string;
                          } | null;
                        }) =>
                          updateQuery((data) => {
                            return {
                              ...data,
                              vercelApiProjects: {
                                ...data.vercelApiProjects,
                                projects: data.vercelApiProjects.projects.map(
                                  (p) => {
                                    if (p.id === project.id) {
                                      return {
                                        ...p,
                                        status: input.status,
                                        linkedProject: input.linkedProject,
                                      };
                                    }
                                    return p;
                                  },
                                ),
                              },
                            };
                          });
                        return (
                          <SyncProject
                            accountSlug={props.ctx.linkedAccount.slug}
                            org={project.link.org}
                            repo={project.link.repo}
                            onSynced={(projectId) =>
                              updateProject({
                                status: VercelApiProjectStatus.Linked,
                                linkedProject: {
                                  __typename: "Project",
                                  id: projectId,
                                },
                              })
                            }
                            onError={() =>
                              updateProject({
                                status: VercelApiProjectStatus.UnknownError,
                                linkedProject: null,
                              })
                            }
                          />
                        );
                      }
                      return (
                        <div className="flex items-center gap-1">
                          <CircleEllipsisIcon className="h-4 w-4 text-blue-500" />
                          Waiting for sync
                        </div>
                      );
                    }
                    case VercelApiProjectStatus.UnknownError:
                      return (
                        <div className="flex items-center gap-1">
                          <AlertCircleIcon className="h-4 w-4 text-danger-500" />
                          Error while syncing
                        </div>
                      );
                    case VercelApiProjectStatus.ProviderNotSupported:
                    case VercelApiProjectStatus.NoProvider:
                      return (
                        <div className="flex items-center gap-1">
                          <AlertCircleIcon className="h-4 w-4 text-danger-500" />
                          Not linked to GitHub
                        </div>
                      );
                  }
                })()}
              </div>
            </ListRow>
          );
        })}
      </List>
      {requireGithubAccessCount > 0 && (
        <p className="mt-6 text-center font-medium">
          {requireGithubAccessCount}
          {requireGithubAccessCount > 1
            ? " projects require"
            : " project require"}{" "}
          GitHub access.
          <br />
          Please{" "}
          <Anchor
            href={`${config.get(
              "github.appUrl",
            )}/installations/new?state=${encodeURIComponent(
              window.location.pathname,
            )}`}
            external
          >
            add a GitHub account
          </Anchor>{" "}
          or{" "}
          <Anchor href={config.get("github.appUrl")} external>
            configure your existing GitHub integration
          </Anchor>
          .
        </p>
      )}
      {!syncingProject && (
        <div className="mt-6 text-center">
          <Button
            onClick={() => {
              completeSetupWithVariables();
            }}
            disabled={completing || completed}
          >
            Complete setup and go back to Vercel
          </Button>
        </div>
      )}
    </div>
  );
};
