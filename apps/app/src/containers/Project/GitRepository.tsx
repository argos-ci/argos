import { useApolloClient, useMutation } from "@apollo/client";
import { ArrowTopRightOnSquareIcon } from "@heroicons/react/24/outline";
import { MarkGithubIcon } from "@primer/octicons-react";
import { useState } from "react";
import { FormProvider, SubmitHandler, useForm } from "react-hook-form";

import config from "@/config";
import { FragmentType, graphql, useFragment } from "@/gql";
import { ProjectGitRepository_ProjectFragment } from "@/gql/graphql";
import { Button, ButtonIcon } from "@/ui/Button";
import { Card, CardBody, CardParagraph, CardTitle } from "@/ui/Card";
import { Form } from "@/ui/Form";
import { FormCardFooter } from "@/ui/FormCardFooter";
import { FormCheckbox } from "@/ui/FormCheckbox";
import { Anchor } from "@/ui/Link";

import { ConnectRepository } from "./ConnectRepository";

const ProjectFragment = graphql(`
  fragment ProjectGitRepository_Project on Project {
    id
    ghRepository {
      id
      fullName
      url
    }
    prCommentEnabled
  }
`);

const UnlinkRepositoryMutation = graphql(`
  mutation ProjectGitRepository_unlinkRepository($projectId: ID!) {
    unlinkRepository(input: { projectId: $projectId }) {
      id
      ...ProjectGitRepository_Project
    }
  }
`);

const LinkRepositoryMutation = graphql(`
  mutation ProjectGitRepository_linkRepository(
    $projectId: ID!
    $repo: String!
    $owner: String!
  ) {
    linkRepository(
      input: { projectId: $projectId, repo: $repo, owner: $owner }
    ) {
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

type UnlinkRepositoryButton = {
  project: ProjectGitRepository_ProjectFragment;
};

const UnlinkRepositoryButton = (props: UnlinkRepositoryButton) => {
  const [unlink] = useMutation(UnlinkRepositoryMutation, {
    variables: {
      projectId: props.project.id,
    },
    optimisticResponse: {
      unlinkRepository: {
        id: props.project.id,
        ghRepository: null,
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

const LinkRepository = (props: { projectId: string }) => {
  const [connectRepository, { loading }] = useMutation(LinkRepositoryMutation, {
    optimisticResponse: {
      linkRepository: {
        id: props.projectId,
        ghRepository: {
          id: "new",
        },
      } as ProjectGitRepository_ProjectFragment,
    },
  });
  return (
    <ConnectRepository
      disabled={loading}
      onSelectRepository={(repo) => {
        connectRepository({
          variables: {
            projectId: props.projectId,
            repo: repo.name,
            owner: repo.owner_login,
          },
        });
      }}
      connectButtonLabel="Link"
    />
  );
};

type Inputs = {
  prCommentEnabled: boolean;
};

export type GithubOptionsFormProps = {
  project: ProjectGitRepository_ProjectFragment;
};

const GithubOptionsForm = ({ project }: GithubOptionsFormProps) => {
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
    <>
      <FormProvider {...form}>
        <Form onSubmit={onSubmit}>
          <div className="mx-4 mb-4 px-4 pb-4">
            <FormCheckbox
              {...form.register("prCommentEnabled")}
              label="Enable pull request comments"
            />
          </div>
          <FormCardFooter />
        </Form>
      </FormProvider>
    </>
  );
};

export const ProjectGitRepository = (props: ProjectGitRepositoryProps) => {
  const project = useFragment(ProjectFragment, props.project);

  const [started, setStarted] = useState(false);
  return (
    <Card>
      <CardBody>
        <CardTitle>Connected Git Repository</CardTitle>
        <CardParagraph>
          Connect a GitHub repository to your project to add status checks on
          pull-requests.
        </CardParagraph>
        {project.ghRepository ? (
          <div>
            <div className="flex items-center gap-4 rounded border p-4">
              <MarkGithubIcon size={24} className="shrink-0" />
              <div className="flex-1 font-semibold">
                <a
                  className="text-white no-underline hover:underline"
                  href={project.ghRepository.url}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  {project.ghRepository.fullName}{" "}
                  <ArrowTopRightOnSquareIcon className="inline h-[1em] w-[1em]" />
                </a>
              </div>
              <UnlinkRepositoryButton project={project} />
            </div>
          </div>
        ) : started ? (
          <LinkRepository projectId={project.id} />
        ) : (
          <div className="flex items-center justify-between gap-4 rounded border p-4">
            <Button color="neutral" onClick={() => setStarted(true)}>
              <ButtonIcon>
                <MarkGithubIcon />
              </ButtonIcon>
              GitHub
            </Button>
            <div>
              Need another provider?{" "}
              <Anchor href={`mailto:${config.get("contactEmail")}`}>
                Contact us
              </Anchor>
            </div>
          </div>
        )}
      </CardBody>

      {project.ghRepository ? <GithubOptionsForm project={project} /> : null}
    </Card>
  );
};
