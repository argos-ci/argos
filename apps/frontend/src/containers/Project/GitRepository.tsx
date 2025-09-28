import { useApolloClient, useMutation } from "@apollo/client/react";
import { SubmitHandler, useForm } from "react-hook-form";

import { DocumentType, graphql } from "@/gql";
import { ProjectGitRepository_ProjectFragment } from "@/gql/graphql";
import { Button } from "@/ui/Button";
import { Card, CardBody, CardParagraph, CardTitle } from "@/ui/Card";
import { Form } from "@/ui/Form";
import { FormCardFooter } from "@/ui/FormCardFooter";
import { FormSwitch } from "@/ui/FormSwitch";
import { Link } from "@/ui/Link";

import { getRepositoryIcon } from "../Repository";
import { ConnectRepository } from "./ConnectRepository";

const _ProjectFragment = graphql(`
  fragment ProjectGitRepository_Project on Project {
    id
    account {
      id
      slug
    }
    repository {
      __typename
      id
      fullName
      url
    }
    prCommentEnabled
  }
`);

const LinkGithubRepositoryMutation = graphql(`
  mutation ProjectGitRepository_linkGithubRepository(
    $projectId: ID!
    $repo: String!
    $owner: String!
    $installationId: String!
  ) {
    linkGithubRepository(
      input: {
        projectId: $projectId
        repo: $repo
        owner: $owner
        installationId: $installationId
      }
    ) {
      id
      ...ProjectGitRepository_Project
    }
  }
`);

const UnlinkGithubRepositoryMutation = graphql(`
  mutation ProjectGitRepository_unlinkGithubRepository($projectId: ID!) {
    unlinkGithubRepository(input: { projectId: $projectId }) {
      id
      ...ProjectGitRepository_Project
    }
  }
`);

const LinkGitlabProjectMutation = graphql(`
  mutation ProjectGitRepository_linkGitlabProject(
    $projectId: ID!
    $gitlabProjectId: ID!
  ) {
    linkGitlabProject(
      input: { projectId: $projectId, gitlabProjectId: $gitlabProjectId }
    ) {
      id
      ...ProjectGitRepository_Project
    }
  }
`);

const UnlinkGitlabProjectMutation = graphql(`
  mutation ProjectGitRepository_unlinkGitlabProject($projectId: ID!) {
    unlinkGitlabProject(input: { projectId: $projectId }) {
      id
      ...ProjectGitRepository_Project
    }
  }
`);

const UpdateEnablePrCommentMutation = graphql(`
  mutation ProjectGitRepository_updateEnablePrComment(
    $projectId: ID!
    $enabled: Boolean!
  ) {
    updateProjectPrComment(
      input: { projectId: $projectId, enabled: $enabled }
    ) {
      id
      prCommentEnabled
    }
  }
`);

function UnlinkGithubRepositoryButton(props: {
  project: ProjectGitRepository_ProjectFragment;
}) {
  const [unlink] = useMutation(UnlinkGithubRepositoryMutation, {
    variables: {
      projectId: props.project.id,
    },
    optimisticResponse: {
      unlinkGithubRepository: {
        id: props.project.id,
        repository: null,
      } as ProjectGitRepository_ProjectFragment,
    },
  });
  return (
    <Button
      variant="secondary"
      onPress={() => {
        unlink().catch(() => {});
      }}
    >
      Disconnect
    </Button>
  );
}

const UnlinkGitlabProjectButton = (props: {
  project: ProjectGitRepository_ProjectFragment;
}) => {
  const [unlink] = useMutation(UnlinkGitlabProjectMutation, {
    variables: {
      projectId: props.project.id,
    },
    optimisticResponse: {
      unlinkGitlabProject: {
        id: props.project.id,
        repository: null,
      } as ProjectGitRepository_ProjectFragment,
    },
  });
  return (
    <Button
      variant="secondary"
      onPress={() => {
        unlink().catch(() => {});
      }}
    >
      Disconnect
    </Button>
  );
};

const LinkRepository = (props: { projectId: string; accountSlug: string }) => {
  const [linkGithubRepository, { loading: linkGithubRepositoryLoading }] =
    useMutation(LinkGithubRepositoryMutation, {
      optimisticResponse: {
        linkGithubRepository: {
          id: props.projectId,
          repository: {
            __typename: "GithubRepository",
            id: "new",
          },
        } as ProjectGitRepository_ProjectFragment,
      },
    });
  const [linkGitlabProject, { loading: linkGitlabProjectLoading }] =
    useMutation(LinkGitlabProjectMutation, {
      optimisticResponse: {
        linkGitlabProject: {
          id: props.projectId,
          repository: {
            __typename: "GitlabProject",
            id: "new",
          },
        } as ProjectGitRepository_ProjectFragment,
      },
    });
  const loading = linkGithubRepositoryLoading || linkGitlabProjectLoading;
  return (
    <ConnectRepository
      variant="link"
      accountSlug={props.accountSlug}
      disabled={loading}
      onSelectRepository={({ repo, installationId }) => {
        linkGithubRepository({
          variables: {
            projectId: props.projectId,
            repo: repo.name,
            owner: repo.owner_login,
            installationId,
          },
        });
      }}
      onSelectProject={(project) => {
        linkGitlabProject({
          variables: {
            projectId: props.projectId,
            gitlabProjectId: project.id,
          },
        });
      }}
    />
  );
};

type Inputs = {
  enabled: boolean;
};

const GitOptionsForm = ({
  project,
}: {
  project: ProjectGitRepository_ProjectFragment;
}) => {
  const form = useForm<Inputs>({
    defaultValues: { enabled: project.prCommentEnabled },
  });
  const client = useApolloClient();
  const onSubmit: SubmitHandler<Inputs> = async (data) => {
    await client.mutate({
      mutation: UpdateEnablePrCommentMutation,
      variables: {
        projectId: project.id,
        enabled: data.enabled,
      },
    });
    form.reset(data);
  };

  return (
    <Form form={form} onSubmit={onSubmit}>
      <div className="mx-4 mb-4">
        <FormSwitch
          name="enabled"
          control={form.control}
          label="Pull request comments"
          description="When enabled, comments will be posted on pull requests with the status of the Argos builds."
        />
      </div>
      <FormCardFooter control={form.control} />
    </Form>
  );
};

export const ProjectGitRepository = (props: {
  project: DocumentType<typeof _ProjectFragment>;
}) => {
  const { project } = props;
  const RepoIcon = project.repository
    ? getRepositoryIcon(project.repository.__typename)
    : null;
  return (
    <Card>
      <CardBody>
        <CardTitle>Connect Git Repository</CardTitle>
        <CardParagraph>
          Connect a Git provider to your project to enable status checks on pull
          requests.
        </CardParagraph>
        {project.repository && RepoIcon ? (
          <div>
            <div className="flex items-center gap-2 rounded-sm border p-4">
              <RepoIcon className="size-6 shrink-0" />
              <div className="flex-1 font-semibold">
                <Link
                  className="!text"
                  href={project.repository.url}
                  target="_blank"
                >
                  {project.repository.fullName}
                </Link>
              </div>
              {(() => {
                switch (project.repository.__typename) {
                  case "GithubRepository":
                    return <UnlinkGithubRepositoryButton project={project} />;
                  case "GitlabProject":
                    return <UnlinkGitlabProjectButton project={project} />;
                  default:
                    return null;
                }
              })()}
            </div>
          </div>
        ) : (
          <Card className="p-4">
            <LinkRepository
              projectId={project.id}
              accountSlug={project.account.slug}
            />
          </Card>
        )}
      </CardBody>
      {project.repository?.__typename === "GithubRepository" && (
        <GitOptionsForm project={project} />
      )}
    </Card>
  );
};
