/* eslint-disable react/no-unescaped-entities */
import { useMutation } from "@apollo/client";
import { x } from "@xstyled/styled-components";
import { gql } from "graphql-tag";
import { useState } from "react";
import { Helmet } from "react-helmet";

import {
  Alert,
  Card,
  CardBody,
  CardHeader,
  CardText,
  CardTitle,
  Checkbox,
  Code,
  Container,
  Form,
  FormError,
  FormInput,
  FormLabel,
  FormSubmit,
  PrimaryTitle,
  Tag,
  Toast,
  useFormState,
  useToast,
} from "@/components";
import { DocumentationPhrase } from "@/containers/DocumentationPhrase";

const UPDATE_REFERENCE_BRANCH = gql`
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
`;

function TokenCard({ repository }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle id="argos-token">Argos Token</CardTitle>
      </CardHeader>
      <CardBody>
        <CardText fontSize="md">
          Use this <Tag>ARGOS_TOKEN</Tag> to authenticate your repository when
          you send screenshots to Argos.
        </CardText>
        <Code my={3}>ARGOS_TOKEN={repository.token}</Code>
        <Alert my={3} color="warning">
          This token should be kept secret.
        </Alert>
        <CardText fontSize="md" mt={4}>
          <DocumentationPhrase />
        </CardText>
      </CardBody>
    </Card>
  );
}

function UpdateBranchForm({ repository }) {
  const successToast = useToast();
  const errorToast = useToast();

  const [baselineBranch, setBaselineBranch] = useState(
    repository.baselineBranch || repository.defaultBranch || ""
  );
  const initialUseDefaultBranch = repository.baselineBranch === null;
  const [useDefaultBranch, setUseDefaultBranch] = useState(
    initialUseDefaultBranch
  );

  const [updateReferenceBranch, { loading }] = useMutation(
    UPDATE_REFERENCE_BRANCH,
    { onCompleted: () => successToast.show(), onError: () => errorToast.show() }
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
}

function BranchUpdateCard({ repository }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle id="reference-branch">Reference branch</CardTitle>
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

export function RepositorySettings({ repository }) {
  return (
    <Container>
      <Helmet>
        <title>
          {repository.owner.login} / {repository.name} • Settings
        </title>
      </Helmet>

      <PrimaryTitle>Repository Settings</PrimaryTitle>
      <x.div display="flex" rowGap={4} flexDirection="column">
        <TokenCard repository={repository} />
        <BranchUpdateCard repository={repository} />
      </x.div>
    </Container>
  );
}
