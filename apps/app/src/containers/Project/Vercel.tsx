import { useMutation } from "@apollo/client";
import { ArrowTopRightOnSquareIcon } from "@heroicons/react/24/outline";
import { useState } from "react";

import { FragmentType, graphql, useFragment } from "@/gql";
import { ProjectVercel_ProjectFragment } from "@/gql/graphql";
import { Button, ButtonIcon } from "@/ui/Button";
import { Card, CardBody, CardParagraph, CardTitle } from "@/ui/Card";
import { VercelLogo } from "@/ui/VercelLogo";

import { ConnectVercelProject } from "./ConnectVercelProject";

const ProjectFragment = graphql(`
  fragment ProjectVercel_Project on Project {
    id
    account {
      id
    }
    vercelProject {
      id
      configuration {
        id
        url
      }
    }
  }
`);

const UnlinkVercelProjectMutation = graphql(`
  mutation ProjectVercel_unlinkVercelProject($projectId: ID!) {
    unlinkVercelProject(input: { projectId: $projectId }) {
      id
      ...ProjectVercel_Project
    }
  }
`);

const LinkVercelProjectMutation = graphql(`
  mutation ProjectVercel_linkVercelProject(
    $projectId: ID!
    $configurationId: ID!
    $vercelProjectId: ID!
  ) {
    linkVercelProject(
      input: {
        projectId: $projectId
        configurationId: $configurationId
        vercelProjectId: $vercelProjectId
      }
    ) {
      id
      ...ProjectVercel_Project
    }
  }
`);

type UnlinkVercelButton = {
  project: ProjectVercel_ProjectFragment;
};

const UnlinkVercelButton = (props: UnlinkVercelButton) => {
  const [unlink] = useMutation(UnlinkVercelProjectMutation, {
    variables: {
      projectId: props.project.id,
    },
    optimisticResponse: {
      unlinkVercelProject: {
        id: props.project.id,
        vercelProject: null,
      } as ProjectVercel_ProjectFragment,
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

export type ProjectVercelProps = {
  project: FragmentType<typeof ProjectFragment>;
};

const LinkVercelProject = (props: { projectId: string; accountId: string }) => {
  const [connectProject, { loading }] = useMutation(LinkVercelProjectMutation);
  return (
    <ConnectVercelProject
      disabled={loading}
      accountId={props.accountId}
      onSelectProject={({ configuration, vercelProjectId }) => {
        connectProject({
          variables: {
            configurationId: configuration.id,
            projectId: props.projectId,
            vercelProjectId,
          },
          optimisticResponse: {
            linkVercelProject: {
              id: props.projectId,
              vercelProject: {
                id: "new",
                configuration: {
                  id: configuration.id,
                  url: configuration.url,
                },
              },
            } as ProjectVercel_ProjectFragment,
          },
        });
      }}
    />
  );
};

export const ProjectVercel = (props: ProjectVercelProps) => {
  const project = useFragment(ProjectFragment, props.project);
  const [started, setStarted] = useState(false);
  return (
    <Card>
      <CardBody>
        <CardTitle>Connected Vercel Project</CardTitle>
        <CardParagraph>
          Connect a Vercel project to automatically create an Argos build when
          deploying on Vercel.
        </CardParagraph>
        {project.vercelProject ? (
          <div className="flex items-center gap-4 rounded border p-4">
            <VercelLogo height={24} />
            <div className="flex-1 font-semibold">
              <a
                className="text-white no-underline hover:underline"
                href={project.vercelProject.configuration.url}
                target="_blank"
                rel="noopener noreferrer"
              >
                Manage on Vercel{" "}
                <ArrowTopRightOnSquareIcon className="inline h-[1em] w-[1em]" />
              </a>
            </div>
            <UnlinkVercelButton project={project} />
          </div>
        ) : started ? (
          <LinkVercelProject
            projectId={project.id}
            accountId={project.account.id}
          />
        ) : (
          <div className="flex items-center justify-between gap-4 rounded border p-4">
            <Button color="neutral" onClick={() => setStarted(true)}>
              <ButtonIcon>
                <VercelLogo />
              </ButtonIcon>
              Vercel
            </Button>
          </div>
        )}
      </CardBody>
    </Card>
  );
};
