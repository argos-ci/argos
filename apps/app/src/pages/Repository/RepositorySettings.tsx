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

import { useRepositoryContext } from ".";

const RepositoryQuery = graphql(`
  query RepositorySettings_repository(
    $ownerLogin: String!
    $repositoryName: String!
  ) {
    repository(ownerLogin: $ownerLogin, repositoryName: $repositoryName) {
      id
      token
      baselineBranch
      defaultBranch
    }
  }
`);

const UpdateReferenceBranchMutation = graphql(`
  mutation RepositorySettings_updateReferenceBranch(
    $repositoryId: String!
    $baselineBranch: String
  ) {
    updateReferenceBranch(
      repositoryId: $repositoryId
      baselineBranch: $baselineBranch
    ) {
      id
      baselineBranch
      defaultBranch
    }
  }
`);

type RepositoryDocument = DocumentType<typeof RepositoryQuery>;
type Repository = NonNullable<RepositoryDocument["repository"]>;

const TokenCard = ({ repository }: { repository: Repository }) => {
  return (
    <Card>
      <CardBody>
        <CardTitle>Upload token</CardTitle>
        <CardParagraph>
          Use this <Code>ARGOS_TOKEN</Code> to authenticate your repository when
          you send screenshots to Argos.
        </CardParagraph>
        <Pre>
          <code>ARGOS_TOKEN={repository.token}</code>
        </Pre>
        <CardParagraph>
          <strong>
            This token should be kept secret. Do not expose it publicly.
          </strong>
        </CardParagraph>
      </CardBody>
      <CardFooter>
        Read{" "}
        <Anchor href="https://docs.argos-ci.com" external>
          Argos documentation
        </Anchor>{" "}
        for more information about installing and using it.
      </CardFooter>
    </Card>
  );
};

const ReferenceBranchCard = ({ repository }: { repository: Repository }) => {
  const defaultUseDefaultBranch = repository.baselineBranch === null;
  const [useDefaultBranch, setUseDefaultBranch] = useState(
    defaultUseDefaultBranch
  );
  const [baselineBranch, setBaselineBranch] = useState(
    repository.baselineBranch || repository.defaultBranch || ""
  );

  const [updateReferenceBranch, { loading, data: updated, error }] =
    useMutation(UpdateReferenceBranchMutation);

  const handleSubmit: React.FormEventHandler<HTMLFormElement> = (event) => {
    event.preventDefault();
    updateReferenceBranch({
      variables: {
        repositoryId: repository.id,
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
                className="focus:shadow-outline w-full appearance-none rounded border border-border bg-slate-900 py-2 px-3 leading-tight text-on shadow invalid:border-red-800 focus:outline-none"
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

export const RepositorySettings = () => {
  const { ownerLogin, repositoryName } = useParams();
  const { hasWritePermission } = useRepositoryContext();

  if (!ownerLogin || !repositoryName) {
    return <NotFound />;
  }

  if (!hasWritePermission) {
    return <NotFound />;
  }

  return (
    <Container>
      <Helmet>
        <title>
          {ownerLogin}/{repositoryName} • Settings
        </title>
      </Helmet>
      <Heading>Repository Settings</Heading>
      <Query
        fallback={<PageLoader />}
        query={RepositoryQuery}
        variables={{ ownerLogin, repositoryName }}
      >
        {({ repository }) => {
          if (!repository) return <NotFound />;

          return (
            <SettingsLayout>
              <TokenCard repository={repository} />
              <ReferenceBranchCard repository={repository} />
            </SettingsLayout>
          );
        }}
      </Query>
    </Container>
  );
};
