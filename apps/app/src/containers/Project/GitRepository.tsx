import { useMutation } from "@apollo/client";
import { ArrowTopRightOnSquareIcon } from "@heroicons/react/24/outline";
import { MarkGithubIcon } from "@primer/octicons-react";
import { useState } from "react";

import config from "@/config";
import { FragmentType, graphql, useFragment } from "@/gql";
import { ProjectGitRepository_ProjectFragment } from "@/gql/graphql";
import { Button, ButtonIcon } from "@/ui/Button";
import { Card, CardBody, CardParagraph, CardTitle } from "@/ui/Card";
import { Anchor } from "@/ui/Link";

import { ConnectRepository } from "./ConnectRepository";

const ProjectFragment = graphql(`
  fragment ProjectGitRepository_Project on Project {
    id
    ghRepository {
      id
      fullName
    }
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
          <div className="flex items-center gap-4 rounded border p-4">
            <MarkGithubIcon size={24} className="shrink-0" />
            <div className="flex-1 font-semibold">
              <a
                className="text-white no-underline hover:underline"
                href={`https://github.com/${project.ghRepository.fullName}`}
                target="_blank"
                rel="noopener noreferrer"
              >
                {project.ghRepository.fullName}{" "}
                <ArrowTopRightOnSquareIcon className="inline h-[1em] w-[1em]" />
              </a>
            </div>
            <UnlinkRepositoryButton project={project} />
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
              Use another provider?{" "}
              <Anchor href={`mailto:${config.get("contactEmail")}`}>
                Contact us
              </Anchor>
            </div>
          </div>
        )}
      </CardBody>
    </Card>
  );
};
