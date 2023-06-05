import { useMutation } from "@apollo/client";
import { Helmet } from "react-helmet";
import { useNavigate, useParams } from "react-router-dom";

import { ConnectRepository } from "@/containers/Project/ConnectRepository";
import { graphql } from "@/gql";
import { Container } from "@/ui/Container";
import { Heading, Headline } from "@/ui/Typography";

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

export const AccountNewProject = () => {
  const { accountSlug } = useParams();
  const navigate = useNavigate();
  const [createProject, { loading }] = useMutation(CreateProjectMutation, {
    onCompleted: (result) => {
      if (result) {
        const project = result.createProject;
        navigate(`/${project.account.slug}/${project.name}`);
      }
    },
  });

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
          <ConnectRepository
            disabled={loading}
            onSelectRepository={(repo) => {
              createProject({
                variables: {
                  repo: repo.name,
                  owner: repo.owner_login,
                  accountSlug: accountSlug,
                },
              });
            }}
          />
        </div>
      </Container>
    </>
  );
};
