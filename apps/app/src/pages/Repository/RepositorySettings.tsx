import { Helmet } from "react-helmet";
import { useParams } from "react-router-dom";

import { Query } from "@/containers/Apollo";
import { NotFound } from "@/pages/NotFound";
import { graphql, DocumentType } from "@/gql";
import { Heading } from "@/modern/ui/Typography";
import { PageLoader } from "@/modern/ui/PageLoader";
import { Card, CardFooter, CardBody, CardTitle } from "@/modern/ui/Card";
import { Container } from "@/modern/ui/Container";
import { Anchor } from "@/modern/ui/Link";
import { Code } from "@/modern/ui/Code";
import { SettingsLayout } from "@/modern/containers/Layout";
import { Alert } from "@/modern/ui/Alert";
import { Button } from "@/modern/ui/Button";
import { useState } from "react";
import { useMutation } from "@apollo/client";

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
  mutation updateReferenceBranch(
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
        <p className="my-4">
          Use this <Code>ARGOS_TOKEN</Code> to authenticate your repository when
          you send screenshots to Argos.
        </p>
        <pre className="whitespace-pre-wrap rounded bg-slate-900 p-4">
          <code>ARGOS_TOKEN={repository.token}</code>
        </pre>
        <p className="mt-4">
          <strong>
            This token should be kept secret. Do not expose it publicly.
          </strong>
        </p>
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

const UpdateBranchForm = ({ repository }: { repository: Repository }) => {
  const [baselineBranch, setBaselineBranch] = useState(
    repository.baselineBranch || repository.defaultBranch || ""
  );
  const initialUseDefaultBranch = repository.baselineBranch === null;
  const [useDefaultBranch, setUseDefaultBranch] = useState(
    initialUseDefaultBranch
  );

  const [updateReferenceBranch, { loading }] = useMutation(
    UpdateReferenceBranchMutation
  );

  const form = useFormState();

  form.useSubmit(async () => {
    await updateReferenceBranch({
      variables: {
        repositoryId: repository.id,
        baselineBranch: useDefaultBranch ? null : baselineBranch,
      },
    });
  });

  return (
    <Form state={form} mt={4}>
      <x.div>
        <FormLabel name="defaultBranch">
          <Checkbox
            name="defaultBranch"
            onChange={(event) => setUseDefaultBranch(event.target.checked)}
            checked={useDefaultBranch}
          />{" "}
          Use GitHub default branch{" "}
          <x.span color="secondary-text">({repository.defaultBranch})</x.span>
        </FormLabel>
        <FormError name="defaultBranch" mt={2} />
      </x.div>

      {useDefaultBranch ? null : (
        <x.div>
          <FormLabel name="name" required>
            Custom reference branch
          </FormLabel>
          <FormInput
            ref={(element) => {
              if (!element) return;
              // Just checked
              if (
                !useDefaultBranch &&
                initialUseDefaultBranch !== useDefaultBranch
              ) {
                element.focus();
              }
            }}
            name="name"
            placeholder="Branch name"
            onChange={(event) => setBaselineBranch(event.target.value)}
            value={baselineBranch}
            required
          />
          <FormError name="name" mt={2} />
        </x.div>
      )}

      <FormSubmit disabled={loading} alignSelf="start">
        Save changes
      </FormSubmit>

      <Toast state={successToast}>
        <Alert color="success">Changes saved</Alert>
      </Toast>

      <Toast state={errorToast}>
        <Alert color="danger">Something went wrong. Please try again.</Alert>
      </Toast>
    </Form>
  );
};

const ReferenceBranchCard = ({ repository }: { repository: Repository }) => {
  return (
    <Card>
      <CardBody>
        <CardTitle>Reference branch</CardTitle>
        <p>
          Argos uses this branch as the reference for screenshots comparison.
        </p>
      </CardBody>
      <CardFooter className="flex justify-end">
        <Button type="submit">Save</Button>
      </CardFooter>
    </Card>
  );
};

export const RepositorySettings = () => {
  const { ownerLogin, repositoryName } = useParams();

  if (!ownerLogin || !repositoryName) return null;

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
              <SettingsLayout>
                <TokenCard repository={repository} />
                <ReferenceBranchCard repository={repository} />
              </SettingsLayout>
            </SettingsLayout>
          );
        }}
      </Query>
    </Container>
  );
};
