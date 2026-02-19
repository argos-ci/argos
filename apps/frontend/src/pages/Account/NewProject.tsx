import { useMutation } from "@apollo/client/react";
import { invariant } from "@argos/util/invariant";
import { Heading, Text } from "react-aria-components";
import { Helmet } from "react-helmet";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";

import { ConnectRepository } from "@/containers/Project/ConnectRepository";
import { graphql } from "@/gql";
import { Card } from "@/ui/Card";
import {
  Page,
  PageContainer,
  PageHeader,
  PageHeaderContent,
} from "@/ui/Layout";
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
      update: (cache) => {
        cache.modify({
          fields: {
            account(_existingAccountRef, { INVALIDATE }) {
              return INVALIDATE;
            },
          },
        });
      },
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
      update: (cache) => {
        cache.modify({
          fields: {
            account(_existingAccountRef, { INVALIDATE }) {
              return INVALIDATE;
            },
          },
        });
      },
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
              To add visual testing a new project, import an existing Git
              repository.
            </Text>
          </PageHeaderContent>
        </PageHeader>
        <div className="relative max-w-2xl flex-1">
          <Card>
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
        </div>
      </PageContainer>
    </Page>
  );
}
