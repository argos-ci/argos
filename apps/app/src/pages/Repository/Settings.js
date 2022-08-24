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
  Form,
  FormError,
  FormInput,
  FormLabel,
  FormSubmit,
  useFormState,
  Toast,
  useToast,
  PrimaryTitle,
  SidebarLayout,
  SidebarList,
  SidebarTitle,
  SidebarItem,
  SidebarItemLink,
} from "@argos-ci/app/src/components";
import { x } from "@xstyled/styled-components";
import { useMutation } from "@apollo/client";
import { Tag } from "../../components/Tag";
import { DocumentationPhrase } from "../../containers/DocumentationPhrase";
import { EnableToggleButton } from "./EnableToggleButton";

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
        <CardTitle id="argos-token">Argos Token</CardTitle>
      </CardHeader>
      <CardBody>
        <CardText fontSize="md">
          Use this <Tag>ARGOS_TOKEN</Tag> to authenticate your repository when
          you send screenshots to Argos.
        </CardText>
        <Alert my={3}>This token should be kept secret.</Alert>
        <Code>ARGOS_TOKEN={repository.token}</Code>
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

  form.useSubmit(async () => {
    await updateBaselineBranch({
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
        <CardTitle id="enable-repository">
          {repository.enabled ? "Deactivate" : "Activate"} Repository
        </CardTitle>
      </CardHeader>
      <CardBody>
        <EnableToggleButton repository={repository} />
      </CardBody>
    </Card>
  );
}

function SettingsSidebar({ repository }) {
  return (
    <SidebarList>
      <SidebarTitle>Repository settings</SidebarTitle>
      {repository.enabled ? (
        <>
          <SidebarItem>
            <SidebarItemLink href="#argos-token">Argos Token</SidebarItemLink>
          </SidebarItem>

          <SidebarItem>
            <SidebarItemLink href="#reference-branch">
              Reference branch
            </SidebarItemLink>
          </SidebarItem>
        </>
      ) : null}
      <SidebarItem>
        <SidebarItemLink href="#enable-repository">
          Enable repository
        </SidebarItemLink>
      </SidebarItem>
    </SidebarList>
  );
}

export function RepositorySettings({ repository }) {
  return (
    <Container>
      <Helmet>
        <title>Settings</title>
      </Helmet>

      <SidebarLayout>
        <SettingsSidebar repository={repository} />

        <SidebarLayout.PageTitle>
          <PrimaryTitle>Repository settings</PrimaryTitle>
        </SidebarLayout.PageTitle>

        <SidebarLayout.PageContent>
          <x.div display="flex" rowGap={4} flexDirection="column">
            {repository.enabled && (
              <>
                <TokenCard repository={repository} />
                <BranchUpdateCard repository={repository} />
              </>
            )}
            <EnableRepositoryCard repository={repository} />
          </x.div>
        </SidebarLayout.PageContent>
      </SidebarLayout>
    </Container>
  );
}
