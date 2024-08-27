import { useMutation } from "@apollo/client";
import { Helmet } from "react-helmet";
import { useNavigate, useParams } from "react-router-dom";

import { ConnectRepository } from "@/containers/Project/ConnectRepository";
import { graphql } from "@/gql";
import { Container } from "@/ui/Container";
import { getGraphQLErrorMessage } from "@/ui/Form";
import { Heading, Headline } from "@/ui/Typography";

const ImportGithubProjectMutation = graphql(`
  mutation NewProject_importGithubProject(
    $repo: String!
    $owner: String!
    $accountSlug: String!
    $app: GitHubAppType!
  ) {
    importGithubProject(
      input: {
        repo: $repo
        owner: $owner
        accountSlug: $accountSlug
        app: $app
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
    <>
      <Helmet>
        <title>New Project</title>
      </Helmet>
      <div className="bg-subtle flex-1">
        <Container className="py-10">
          <Heading>Create a new Project</Heading>
          <Headline>
            To add visual testing a new Project, import an existing Git
            Repository.
          </Headline>
          <div className="relative mt-8 max-w-2xl" style={{ height: 382 }}>
            <ConnectRepository
              variant="import"
              disabled={loading}
              accountSlug={accountSlug}
              onSelectRepository={(repo, app) => {
                importGithubProject({
                  variables: {
                    repo: repo.name,
                    owner: repo.owner_login,
                    accountSlug: accountSlug,
                    app,
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
        </Container>
      </div>
    </>
  );
}
