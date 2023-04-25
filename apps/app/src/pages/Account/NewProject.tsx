import { useMutation } from "@apollo/client";
import { MarkGithubIcon } from "@primer/octicons-react";
import { useState } from "react";
import { Helmet } from "react-helmet";
import { useNavigate, useParams } from "react-router-dom";

import config from "@/config";
import { Query } from "@/containers/Apollo";
import { InstallationsSelect } from "@/containers/InstallationsSelect";
import { RepositoryList } from "@/containers/RepositoryList";
import { DocumentType, graphql } from "@/gql";
import { Button, ButtonIcon } from "@/ui/Button";
import { Card } from "@/ui/Card";
import { Container } from "@/ui/Container";
import { PageLoader } from "@/ui/PageLoader";
import { Heading, Headline } from "@/ui/Typography";

import { NotFound } from "../NotFound";

const MeQuery = graphql(`
  query AccountNewProject_me {
    me {
      ghInstallations {
        edges {
          id
          ...InstallationsSelect_GhApiInstallation
        }
        pageInfo {
          totalCount
        }
      }
    }
  }
`);

const CreateProjectMutation = graphql(`
  mutation NewProject_createProject(
    $repo: String!
    $owner: String!
    $accountSlug: String!
  ) {
    createProject(
      input: { repo: $repo, owner: $owner, accountSlug: $accountSlug }
    ) {
      id
      name
      account {
        id
        slug
      }
    }
  }
`);

type Installation = NonNullable<
  DocumentType<typeof MeQuery>["me"]
>["ghInstallations"]["edges"][0];

const Installations = (props: {
  installations: Installation[];
  accountSlug: string;
}) => {
  const navigate = useNavigate();
  const [createProject, { loading }] = useMutation(CreateProjectMutation);
  const firstInstallation = props.installations[0];
  if (!firstInstallation) {
    throw new Error("No installations");
  }
  const [value, setValue] = useState<string>(firstInstallation.id);
  return (
    <div
      className="mt-8 flex flex-col gap-4"
      style={{ height: 400, maxWidth: 800 }}
    >
      <InstallationsSelect
        disabled={loading}
        installations={props.installations}
        value={value}
        setValue={setValue}
      />
      <RepositoryList
        installationId={value}
        disabled={loading}
        importRepo={(repo) => {
          createProject({
            variables: {
              repo: repo.name,
              owner: repo.owner_login,
              accountSlug: props.accountSlug,
            },
          }).then((result) => {
            if (result.data) {
              const project = result.data.createProject;
              navigate(`/${project.account.slug}/${project.name}`);
            }
          });
        }}
      />
    </div>
  );
};

export const AccountNewProject = () => {
  const { accountSlug } = useParams();

  if (!accountSlug) {
    return null;
  }

  return (
    <>
      <Helmet>
        <title>New Project</title>
      </Helmet>
      <Container>
        <Heading>Create a new Project</Heading>
        <Headline>
          To add visual testing a new Project, import an existing Git
          Repository.
        </Headline>
        <div className="relative mt-8 max-w-2xl" style={{ height: 382 }}>
          <Query
            fallback={
              <Card className="h-full">
                <PageLoader />
              </Card>
            }
            query={MeQuery}
          >
            {({ me }) => {
              if (!me) return <NotFound />;

              if (!me.ghInstallations.edges.length) {
                return (
                  <Card className="flex h-full flex-col items-center justify-center">
                    <div className="mb-4 text-on-light">
                      Install GitHub application to import an existing project
                      from a Git repository.
                    </div>
                    <Button color="neutral">
                      {(buttonProps) => (
                        <a
                          href={`${config.get(
                            "github.appUrl"
                          )}/installations/new?state=${encodeURIComponent(
                            `/${accountSlug}/new`
                          )}`}
                          {...buttonProps}
                        >
                          <ButtonIcon>
                            <MarkGithubIcon />
                          </ButtonIcon>
                          Continue with GitHub
                        </a>
                      )}
                    </Button>
                  </Card>
                );
              }

              return (
                <Installations
                  accountSlug={accountSlug}
                  installations={me.ghInstallations.edges}
                />
              );
            }}
          </Query>
        </div>
      </Container>
    </>
  );
};
