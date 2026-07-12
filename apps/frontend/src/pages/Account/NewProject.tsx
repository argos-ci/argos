import type { ApolloCache } from "@apollo/client";
import { useApolloClient, useMutation } from "@apollo/client/react";
import { invariant } from "@argos/util/invariant";
import { Heading, Text } from "react-aria-components";
import { Helmet } from "react-helmet";
import { SubmitHandler, useForm } from "react-hook-form";
import { useNavigate } from "react-router-dom";

import { ConnectRepository } from "@/containers/Project/ConnectRepository";
import { graphql } from "@/gql";
import { Card } from "@/ui/Card";
import { Form } from "@/ui/Form";
import { FormRootError } from "@/ui/FormRootError";
import { FormSubmit } from "@/ui/FormSubmit";
import { FormTextInput } from "@/ui/FormTextInput";
import {
  Page,
  PageContainer,
  PageHeader,
  PageHeaderContent,
} from "@/ui/Layout";
import { Separator } from "@/ui/Separator";
import { toast } from "@/ui/Toaster";
import { getErrorMessage } from "@/util/error";

import { useAccountParams } from "./AccountParams";

const ImportGithubProjectMutation = graphql(`
  mutation NewProject_importGithubProject(
    $repo: String!
    $owner: String!
    $accountSlug: String!
    $installationId: String!
  ) {
    importGithubProject(
      input: {
        repo: $repo
        owner: $owner
        accountSlug: $accountSlug
        installationId: $installationId
      }
    ) {
      id
      slug
    }
  }
`);

const ImportGitlabProjectMutation = graphql(`
  mutation NewProject_importGitlabProject(
    $gitlabProjectId: ID!
    $accountSlug: String!
  ) {
    importGitlabProject(
      input: { gitlabProjectId: $gitlabProjectId, accountSlug: $accountSlug }
    ) {
      id
      slug
    }
  }
`);

const CreateProjectMutation = graphql(`
  mutation NewProject_createProject($name: String!, $accountSlug: String!) {
    createProject(input: { name: $name, accountSlug: $accountSlug }) {
      id
      slug
    }
  }
`);

/** Invalidate the cached account so the new project appears in its lists. */
const invalidateAccount = (cache: ApolloCache) => {
  cache.modify({
    fields: {
      account(_existingAccountRef, { INVALIDATE }) {
        return INVALIDATE;
      },
    },
  });
};

type CreateProjectInputs = {
  name: string;
};

function CreateProjectForm(props: { accountSlug: string }) {
  const navigate = useNavigate();
  const client = useApolloClient();
  const form = useForm<CreateProjectInputs>({
    defaultValues: { name: "" },
  });
  const onSubmit: SubmitHandler<CreateProjectInputs> = async (data) => {
    const result = await client.mutate({
      mutation: CreateProjectMutation,
      variables: {
        name: data.name,
        accountSlug: props.accountSlug,
      },
      update: invalidateAccount,
    });
    if (result.data) {
      await navigate(`/${result.data.createProject.slug}`);
    }
  };
  return (
    <Form form={form} onSubmit={onSubmit}>
      <p className="text-low mb-4 text-sm">
        Start with just a name. You can connect a GitHub or GitLab repository
        later from your project settings.
      </p>
      <FormTextInput
        control={form.control}
        {...form.register("name", {
          required: "Please enter a project name",
          maxLength: {
            value: 100,
            message: "Project name must be 100 characters or less",
          },
          pattern: {
            value: /^[a-zA-Z0-9\-_.]+$/,
            message:
              "Project names must be alphanumeric characters with dots, hyphens and underscores.",
          },
        })}
        label="Project name"
        placeholder="e.g. my-project"
      />
      <div className="mt-4 flex items-center justify-end gap-4">
        <FormRootError control={form.control} className="flex-1" />
        <FormSubmit control={form.control}>Create project</FormSubmit>
      </div>
    </Form>
  );
}

export function Component() {
  const params = useAccountParams();
  invariant(params, "Cannot create a new project outside of an account");
  const navigate = useNavigate();
  const [importGithubProject, { loading: githubImportLoading }] = useMutation(
    ImportGithubProjectMutation,
    {
      onCompleted: (result) => {
        if (result) {
          const project = result.importGithubProject;
          navigate(`/${project.slug}`);
        }
      },
      update: invalidateAccount,
    },
  );

  const [importGitLabProject, { loading: gitlabImportLoading }] = useMutation(
    ImportGitlabProjectMutation,
    {
      onCompleted: (result) => {
        if (result) {
          const project = result.importGitlabProject;
          navigate(`/${project.slug}`);
        }
      },
      update: invalidateAccount,
    },
  );

  const loading = githubImportLoading || gitlabImportLoading;

  return (
    <Page>
      <Helmet>
        <title>New Project</title>
      </Helmet>
      <PageContainer>
        <PageHeader>
          <PageHeaderContent>
            <Heading>Create a new Project</Heading>
            <Text slot="headline">
              Import an existing Git repository, or create a project and connect
              a repository later.
            </Text>
          </PageHeaderContent>
        </PageHeader>
        <div className="flex max-w-6xl flex-col items-start gap-12 lg:flex-row">
          <section className="flex w-full flex-1 flex-col gap-4">
            <h2 className="text-xl font-medium">Import a Git repository</h2>
            <Card className="relative p-4">
              <ConnectRepository
                variant="import"
                disabled={loading}
                accountSlug={params.accountSlug}
                onSelectRepository={({ repo, installationId }) => {
                  importGithubProject({
                    variables: {
                      repo: repo.name,
                      owner: repo.owner_login,
                      accountSlug: params.accountSlug,
                      installationId,
                    },
                  }).catch((error) => {
                    toast.error(getErrorMessage(error));
                  });
                }}
                onSelectProject={(glProject) => {
                  importGitLabProject({
                    variables: {
                      gitlabProjectId: glProject.id,
                      accountSlug: params.accountSlug,
                    },
                  }).catch((error) => {
                    toast.error(getErrorMessage(error));
                  });
                }}
              />
            </Card>
          </section>
          <Separator
            orientation="vertical"
            className="self-stretch max-lg:hidden"
          />
          <Separator orientation="horizontal" className="w-full lg:hidden" />
          <section className="flex flex-1 flex-col gap-4">
            <h2 className="text-xl font-medium">
              Create a project without Git
            </h2>
            <CreateProjectForm accountSlug={params.accountSlug} />
          </section>
        </div>
      </PageContainer>
    </Page>
  );
}
