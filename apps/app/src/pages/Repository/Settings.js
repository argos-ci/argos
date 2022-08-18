import React from "react";
import { Helmet } from "react-helmet";
import { gql } from "graphql-tag";
import {
  Alert,
  Container,
  Card,
  CardBody,
  CardHeader,
  CardTitle,
  CardText,
  Code,
  Button,
  Form,
  FormError,
  FormInput,
  FormLabel,
  FormSubmit,
  useFormState,
  Toast,
  useToast,
  DocumentationLinkPhrase,
} from "@argos-ci/app/src/components";
import {
  useRepository,
  useToggleRepository,
} from "../../containers/RepositoryContext";
import { x } from "@xstyled/styled-components";
import { useMutation } from "@apollo/client";
import { Tag } from "../../components/Tag";

const UPDATE_BASELINE_BRANCH = gql`
  mutation UpdateBaselineBranch($repositoryId: String!, $branchName: String!) {
    updateBaselineBranch(repositoryId: $repositoryId, branchName: $branchName) {
      id
      baselineBranch
    }
  }
`;

function TokenCard({ repository }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Argos Token</CardTitle>
      </CardHeader>
      <CardBody>
        <CardText fontSize="md">
          Use this <Tag>ARGOS_TOKEN</Tag> to authenticate your repository when
          you send screenshots to Argos.
        </CardText>
        <Alert my={3}>This token should be kept secret.</Alert>
        <Code>ARGOS_TOKEN={repository.token}</Code>
        <CardText fontSize="md" mt={4}>
          <DocumentationLinkPhrase />
        </CardText>
      </CardBody>
    </Card>
  );
}

function UpdateBranchForm({ repository }) {
  const successToast = useToast();
  const errorToast = useToast();

  const [updateBaselineBranch, { loading: branchUpdateLoading }] = useMutation(
    UPDATE_BASELINE_BRANCH,
    {
      onCompleted: () => successToast.show(),
      onError: () => errorToast.show(),
    }
  );

  const form = useFormState({
    defaultValues: { name: repository.baselineBranch },
  });
  form.useSubmit(() => {
    updateBaselineBranch({
      variables: {
        repositoryId: repository.id,
        branchName: form.values.name,
      },
    });
  });

  return (
    <Form state={form} mt={4}>
      <FormLabel name={form.names.name}>Reference Branch</FormLabel>

      <x.div display="flex" gap={2}>
        <FormInput name={form.names.name} placeholder="Branch name" required />
        <FormSubmit disabled={branchUpdateLoading}>Update Branch</FormSubmit>
      </x.div>

      <FormError name={form.names.name} />

      <Toast state={successToast}>
        <Alert severity="success">Reference branch updated.</Alert>
      </Toast>

      <Toast state={errorToast}>
        <Alert severity="error">Something went wrong. Please try again.</Alert>
      </Toast>
    </Form>
  );
}

function BranchUpdateCard({ repository }) {
  console.log(repository.baselineBranch);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Reference branch</CardTitle>
      </CardHeader>
      <CardBody>
        <CardText fontSize="md">
          Argos uses this branch as the reference for screenshots comparison.
        </CardText>
        <UpdateBranchForm repository={repository} />
      </CardBody>
    </Card>
  );
}

function EnableRepositoryCard({ repository }) {
  const { toggleRepository, loading, error } = useToggleRepository();

  return (
    <Card>
      <CardHeader>
        <CardTitle>
          {repository.enabled ? "Deactivate" : "Activate"} Repository
        </CardTitle>
      </CardHeader>
      <CardBody>
        {error && (
          <Alert variant="danger">
            Something went wrong. Please try again.
          </Alert>
        )}

        <CardText>
          <Button
            disabled={loading}
            variant={repository.enabled ? "danger" : "success"}
            onClick={() =>
              toggleRepository({
                variables: {
                  enabled: !repository.enabled,
                  repositoryId: repository.id,
                },
              })
            }
          >
            {repository.enabled ? "Deactivate" : "Activate"} Repository
          </Button>
        </CardText>
      </CardBody>
    </Card>
  );
}

export function RepositorySettings() {
  const { repository } = useRepository();

  return (
    <Container>
      <Helmet>
        <title>Settings</title>
      </Helmet>
      <x.div display="flex" rowGap={4} flexDirection="column">
        {repository.enabled && (
          <>
            <TokenCard repository={repository} />
            <BranchUpdateCard repository={repository} />
          </>
        )}
        <EnableRepositoryCard repository={repository} />
      </x.div>
    </Container>
  );
}
