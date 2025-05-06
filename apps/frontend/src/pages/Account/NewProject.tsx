import { useMutation } from "@apollo/client";
import { Heading, Text } from "react-aria-components";
import { Helmet } from "react-helmet";
import { useNavigate, useParams } from "react-router-dom";

import { ConnectRepository } from "@/containers/Project/ConnectRepository";
import { graphql } from "@/gql";
import { getGraphQLErrorMessage } from "@/ui/Form";
import {
  Page,
  PageContainer,
  PageHeader,
  PageHeaderContent,
} from "@/ui/Layout";

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

/** @route */
export function Component() {
  const { accountSlug } = useParams();
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

  if (!accountSlug) {
    return null;
  }

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
          <ConnectRepository
            variant="import"
            disabled={loading}
            accountSlug={accountSlug}
            onSelectRepository={({ repo, installationId }) => {
              importGithubProject({
                variables: {
                  repo: repo.name,
                  owner: repo.owner_login,
                  accountSlug: accountSlug,
                  installationId,
                },
              }).catch((error) => {
                // TODO: Show error in UI
                alert(getGraphQLErrorMessage(error));
              });
            }}
            onSelectProject={(glProject) => {
              importGitLabProject({
                variables: {
                  gitlabProjectId: glProject.id,
                  accountSlug: accountSlug,
                },
              }).catch((error) => {
                // TODO: Show error in UI
                alert(getGraphQLErrorMessage(error));
              });
            }}
          />
        </div>
      </PageContainer>
    </Page>
  );
}
