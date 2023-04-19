import { useMutation } from "@apollo/client";
import { CheckIcon, XIcon } from "@primer/octicons-react";
import { useState } from "react";
import { Helmet } from "react-helmet";
import { useParams } from "react-router-dom";

import { Query } from "@/containers/Apollo";
import { SettingsLayout } from "@/containers/Layout";
import { DocumentType, graphql } from "@/gql";
import { NotFound } from "@/pages/NotFound";
import { Button } from "@/ui/Button";
import {
  Card,
  CardBody,
  CardFooter,
  CardParagraph,
  CardTitle,
} from "@/ui/Card";
import { Code } from "@/ui/Code";
import { Container } from "@/ui/Container";
import { Anchor } from "@/ui/Link";
import { PageLoader } from "@/ui/PageLoader";
import { Pre } from "@/ui/Pre";
import { Heading } from "@/ui/Typography";

import { useProjectContext } from ".";

const ProjectQuery = graphql(`
  query ProjectSettings_project($accountSlug: String!, $projectSlug: String!) {
    project(accountSlug: $accountSlug, projectSlug: $projectSlug) {
      id
      token
      baselineBranch
      ghRepository {
        id
        defaultBranch
      }
      private
    }
  }
`);

const UpdateBaselineBranchMutation = graphql(`
  mutation ProjectSettings_updateBaselineBranch(
    $projectId: ID!
    $baselineBranch: String
  ) {
    updateProject(input: { id: $projectId, baselineBranch: $baselineBranch }) {
      id
      baselineBranch
    }
  }
`);

const UpdatePrivateMutation = graphql(`
  mutation ProjectSettings_UpdatePrivate($projectId: ID!, $private: Boolean) {
    updateProject(input: { id: $projectId, private: $private }) {
      id
      private
    }
  }
`);

type ProjectDocument = DocumentType<typeof ProjectQuery>;
type Project = NonNullable<ProjectDocument["project"]>;

const TokenCard = ({ project }: { project: Project }) => {
  return (
    <Card>
      <CardBody>
        <CardTitle>Upload token</CardTitle>
        <CardParagraph>
          Use this <Code>ARGOS_TOKEN</Code> to authenticate your project when
          you send screenshots to Argos.
        </CardParagraph>
        <Pre>
          <code>ARGOS_TOKEN={project.token}</code>
        </Pre>
        <CardParagraph>
          <strong>
            This token should be kept secret. Do not expose it publicly.
          </strong>
        </CardParagraph>
      </CardBody>
      <CardFooter>
        Read{" "}
        <Anchor href="https://argos-ci.com/docs" external>
          Argos documentation
        </Anchor>{" "}
        for more information about installing and using it.
      </CardFooter>
    </Card>
  );
};

const ReferenceBranchCard = ({ project }: { project: Project }) => {
  const defaultUseDefaultBranch = project.baselineBranch === null;
  const [useDefaultBranch, setUseDefaultBranch] = useState(
    defaultUseDefaultBranch
  );
  const [baselineBranch, setBaselineBranch] = useState(
    project.baselineBranch || project.ghRepository.defaultBranch || ""
  );

  const [updateReferenceBranch, { loading, data: updated, error }] =
    useMutation(UpdateBaselineBranchMutation);

  const handleSubmit: React.FormEventHandler<HTMLFormElement> = (event) => {
    event.preventDefault();
    updateReferenceBranch({
      variables: {
        projectId: project.id,
        baselineBranch: useDefaultBranch ? null : baselineBranch,
      },
    });
  };

  const baselineBranchRef = (element: HTMLInputElement | null) => {
    if (!element) return;
    // Just checked
    if (!useDefaultBranch && defaultUseDefaultBranch !== useDefaultBranch) {
      element.focus();
    }
  };

  return (
    <Card>
      <form onSubmit={handleSubmit} aria-labelledby="reference-branch">
        <CardBody>
          <CardTitle id="reference-branch">Reference branch</CardTitle>
          <CardParagraph>
            Argos uses this branch as the reference for screenshots comparison.
          </CardParagraph>
          <div className="my-4 flex gap-2">
            <input
              type="checkbox"
              id="useDefaultBranch"
              name="useDefaultBranch"
              checked={useDefaultBranch}
              onChange={(event) => {
                setUseDefaultBranch(event.target.checked);
              }}
            />
            <label htmlFor="useDefaultBranch" className="select-none">
              Use GitHub default branch
            </label>
          </div>
          {!useDefaultBranch && (
            <div className="my-4">
              <label
                htmlFor="baselineBranch"
                className="mb-2 block font-semibold"
              >
                Custom reference branch
              </label>
              <input
                ref={baselineBranchRef}
                type="text"
                id="baselineBranch"
                className="focus:shadow-outline w-full appearance-none rounded border border-border bg-slate-900 px-3 py-2 leading-tight text-on shadow invalid:border-red-800 focus:outline-none"
                name="baselineBranch"
                placeholder="Branch name"
                required
                value={baselineBranch}
                onChange={(event) => {
                  setBaselineBranch(event.target.value);
                }}
              />
            </div>
          )}
        </CardBody>
        <CardFooter className="flex items-center justify-end gap-4">
          {error ? (
            <div className="flex items-center gap-2 font-medium">
              <XIcon className="text-error-500" /> Error while saving
            </div>
          ) : (
            updated && (
              <div className="flex items-center gap-2 font-medium">
                <CheckIcon className="text-success-500" /> Saved
              </div>
            )
          )}
          <Button type="submit" disabled={loading}>
            Save
          </Button>
        </CardFooter>
      </form>
    </Card>
  );
};

const VisibilityCard = ({ project }: { project: Project }) => {
  const [isPrivate, setIsPrivate] = useState(project.private);

  const [updateReferenceBranch, { loading, data: updated, error }] =
    useMutation(UpdatePrivateMutation);

  const handleSubmit: React.FormEventHandler<HTMLFormElement> = (event) => {
    event.preventDefault();
    updateReferenceBranch({
      variables: {
        projectId: project.id,
        private: isPrivate,
      },
    });
  };

  return (
    <Card>
      <form onSubmit={handleSubmit} aria-labelledby="reference-branch">
        <CardBody>
          <CardTitle id="reference-branch">Project visibility</CardTitle>
          <CardParagraph>
            Make a public project private in order to restrict access to builds
            and screenshots to only authorized users.
          </CardParagraph>
          <CardParagraph>
            This will also mark the screenshots as private and use up credit.
          </CardParagraph>
          <div className="my-4 flex gap-2">
            <input
              type="checkbox"
              id="isPrivate"
              name="isPrivate"
              checked={Boolean(isPrivate)}
              onChange={(event) => {
                setIsPrivate(event.target.checked);
              }}
            />
            <label htmlFor="isPrivate" className="select-none">
              Change project visibility to private
            </label>
          </div>
        </CardBody>
        <CardFooter className="flex items-center justify-end gap-4">
          {error ? (
            <div className="flex items-center gap-2 font-medium">
              <XIcon className="text-error-500" /> Error while saving
            </div>
          ) : (
            updated && (
              <div className="flex items-center gap-2 font-medium">
                <CheckIcon className="text-success-500" /> Saved
              </div>
            )
          )}
          <Button type="submit" disabled={loading}>
            Save
          </Button>
        </CardFooter>
      </form>
    </Card>
  );
};

export const ProjectSettings = () => {
  const { accountSlug, projectSlug } = useParams();
  const { hasWritePermission } = useProjectContext();

  if (!accountSlug || !projectSlug) {
    return <NotFound />;
  }

  if (!hasWritePermission) {
    return <NotFound />;
  }

  return (
    <Container>
      <Helmet>
        <title>
          {accountSlug}/{projectSlug} • Settings
        </title>
      </Helmet>
      <Heading>Project Settings</Heading>
      <Query
        fallback={<PageLoader />}
        query={ProjectQuery}
        variables={{
          accountSlug,
          projectSlug,
        }}
      >
        {({ project }) => {
          if (!project) return <NotFound />;

          return (
            <SettingsLayout>
              <TokenCard project={project} />
              <ReferenceBranchCard project={project} />
              {project.private ? null : <VisibilityCard project={project} />}
            </SettingsLayout>
          );
        }}
      </Query>
    </Container>
  );
};
