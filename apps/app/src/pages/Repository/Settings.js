/* eslint-disable react/no-unescaped-entities */
import * as React from "react";
import { Helmet } from "react-helmet";
import { gql } from "graphql-tag";
import { Checkbox } from "ariakit/checkbox";
import {
  Alert,
  Card,
  CardBody,
  CardHeader,
  CardText,
  CardTitle,
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
} from "@argos-ci/app/src/components";
import { x } from "@xstyled/styled-components";
import { useMutation } from "@apollo/client";
import { DocumentationPhrase } from "../../containers/DocumentationPhrase";
import { EnableToggleButton } from "./EnableToggleButton";

const UPDATE_REFERENCE_BRANCH = gql`
  mutation updateReferenceBranch(
    $repositoryId: String!
    $baselineBranch: String
    $useDefaultBranch: Boolean!
  ) {
    updateReferenceBranch(
      repositoryId: $repositoryId
      baselineBranch: $baselineBranch
      useDefaultBranch: $useDefaultBranch
    ) {
      id
      baselineBranch
      useDefaultBranch
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
        <Alert my={3} severity="warning">
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

  const [baselineBranch, setBaselineBranch] = React.useState(
    repository.baselineBranch || ""
  );
  const [useDefaultBranch, setUseDefaultBranch] = React.useState(
    repository.useDefaultBranch
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
        useDefaultBranch,
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
        <FormError name="defaultBranch" />
      </x.div>

      {useDefaultBranch ? null : (
        <x.div>
          <FormLabel name="name" required>
            Other reference Branch
          </FormLabel>
          <FormInput
            name="name"
            placeholder="Branch name"
            onChange={(event) => setBaselineBranch(event.target.value)}
            value={baselineBranch}
            required
          />
          <FormError name="name" />
        </x.div>
      )}

      <FormSubmit
        disabled={loading || (!useDefaultBranch && !baselineBranch)}
        alignSelf="start"
      >
        Update Branch
      </FormSubmit>

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

function EnableRepositoryCard({ repository }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle id="enable-repository">Repository activation</CardTitle>
      </CardHeader>
      <CardBody>
        {repository.enabled ? (
          <>
            This action doesn't delete the screenshots. It only prevents new
            builds to be pushed.
          </>
        ) : (
          <>Activate repository to start visual testing on this project.</>
        )}
        <EnableToggleButton repository={repository} mt={3} />
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
