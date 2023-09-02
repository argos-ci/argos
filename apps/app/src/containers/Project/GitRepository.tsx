import { useApolloClient, useMutation } from "@apollo/client";
import { MarkGithubIcon } from "@primer/octicons-react";
import { FormProvider, SubmitHandler, useForm } from "react-hook-form";

import { FragmentType, graphql, useFragment } from "@/gql";
import { ProjectGitRepository_ProjectFragment } from "@/gql/graphql";
import { Button } from "@/ui/Button";
import { Card, CardBody, CardParagraph, CardTitle } from "@/ui/Card";
import { Form } from "@/ui/Form";
import { FormCardFooter } from "@/ui/FormCardFooter";
import { FormCheckbox } from "@/ui/FormCheckbox";

import { ConnectRepository } from "./ConnectRepository";
import { GitLabLogo } from "../GitLab";
import { Anchor } from "@/ui/Link";

const ProjectFragment = graphql(`
  fragment ProjectGitRepository_Project on Project {
    id
    account {
      id
      slug
    }
    ghRepository {
      id
      fullName
      url
    }
    glProject {
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
  ) {
    linkGithubRepository(
      input: { projectId: $projectId, repo: $repo, owner: $owner }
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
    $id: ID!
    $enable: Boolean!
  ) {
    updateProjectPrComment(input: { id: $id, enable: $enable }) {
      id
      prCommentEnabled
    }
  }
`);

const UnlinkGithubRepositoryButton = (props: {
  project: ProjectGitRepository_ProjectFragment;
}) => {
  const [unlink] = useMutation(UnlinkGithubRepositoryMutation, {
    variables: {
      projectId: props.project.id,
    },
    optimisticResponse: {
      unlinkGithubRepository: {
        id: props.project.id,
        ghRepository: null,
        glProject: null,
      } as ProjectGitRepository_ProjectFragment,
    },
  });
  return (
    <Button
      variant="outline"
      color="neutral"
      onClick={() => {
        unlink();
      }}
    >
      Disconnect
    </Button>
  );
};

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
        ghRepository: null,
        glProject: null,
      } as ProjectGitRepository_ProjectFragment,
    },
  });
  return (
    <Button
      variant="outline"
      color="neutral"
      onClick={() => {
        unlink();
      }}
    >
      Disconnect
    </Button>
  );
};

export type ProjectGitRepositoryProps = {
  project: FragmentType<typeof ProjectFragment>;
};

const LinkRepository = (props: { projectId: string; accountSlug: string }) => {
  const [linkGithubRepository, { loading: linkGithubRepositoryLoading }] =
    useMutation(LinkGithubRepositoryMutation, {
      optimisticResponse: {
        linkGithubRepository: {
          id: props.projectId,
          ghRepository: {
            id: "new",
          },
          glProject: null,
        } as ProjectGitRepository_ProjectFragment,
      },
    });
  const [linkGitlabProject, { loading: linkGitlabProjectLoading }] =
    useMutation(LinkGitlabProjectMutation, {
      optimisticResponse: {
        linkGitlabProject: {
          id: props.projectId,
          ghRepository: null,
          glProject: {
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
      onSelectRepository={(repo) => {
        linkGithubRepository({
          variables: {
            projectId: props.projectId,
            repo: repo.name,
            owner: repo.owner_login,
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
  prCommentEnabled: boolean;
};

export type GitOptionsFormProps = {
  project: ProjectGitRepository_ProjectFragment;
};

const GitOptionsForm = ({ project }: GitOptionsFormProps) => {
  const form = useForm<Inputs>({
    defaultValues: { prCommentEnabled: project.prCommentEnabled },
  });
  const client = useApolloClient();
  const onSubmit: SubmitHandler<Inputs> = async (data) => {
    await client.mutate({
      mutation: UpdateEnablePrCommentMutation,
      variables: {
        id: project.id,
        enable: data.prCommentEnabled,
      },
    });
  };

  return (
    <FormProvider {...form}>
      <Form onSubmit={onSubmit}>
        <div className="mx-4 mb-4">
          <FormCheckbox
            {...form.register("prCommentEnabled")}
            label="Enable pull request comments"
          />
        </div>
        <FormCardFooter />
      </Form>
    </FormProvider>
  );
};

export const ProjectGitRepository = (props: ProjectGitRepositoryProps) => {
  const project = useFragment(ProjectFragment, props.project);
  return (
    <Card>
      <CardBody>
        <CardTitle>Connected Git Repository</CardTitle>
        <CardParagraph>
          Connect a Git provider to your project to add status checks on
          pull-requests.
        </CardParagraph>
        {project.ghRepository ? (
          <div>
            <div className="flex items-center gap-2 rounded border p-4">
              <MarkGithubIcon size={24} className="shrink-0" />
              <div className="flex-1 font-semibold">
                <Anchor
                  href={project.ghRepository.url}
                  external
                  className="!text"
                >
                  {project.ghRepository.fullName}
                </Anchor>
              </div>
              <UnlinkGithubRepositoryButton project={project} />
            </div>
          </div>
        ) : project.glProject ? (
          <div>
            <div className="flex items-center gap-2 rounded border p-4">
              <GitLabLogo className="shrink-0 w-6 h-6" />
              <div className="flex-1 font-semibold">
                <Anchor href={project.glProject.url} external className="!text">
                  {project.glProject.fullName}
                </Anchor>
              </div>
              <UnlinkGitlabProjectButton project={project} />
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
      {project.ghRepository && <GitOptionsForm project={project} />}
    </Card>
  );
};
