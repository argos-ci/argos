import { Helmet } from "react-helmet";
import { useParams } from "react-router-dom";

import { Query } from "@/containers/Apollo";
import { ProjectList } from "@/containers/ProjectList";
import { graphql } from "@/gql";
import { Container } from "@/ui/Container";
import { PageLoader } from "@/ui/PageLoader";

import { NotFound } from "../NotFound";

const AccountQuery = graphql(`
  query AccountProjects_account($slug: String!) {
    account(slug: $slug) {
      id
      projects(first: 100, after: 0) {
        edges {
          id
          ...ProjectList_Project
        }
      }
    }
  }
`);

export const AccountProjects = () => {
  const { accountSlug } = useParams();

  if (!accountSlug) {
    return null;
  }

  return (
    <>
      <Helmet>
        <title>{accountSlug} • Projects</title>
      </Helmet>
      <Query
        fallback={<PageLoader />}
        query={AccountQuery}
        variables={{ slug: accountSlug }}
      >
        {({ account }) => {
          if (!account) return <NotFound />;

          return (
            <Container>
              <ProjectList projects={account.projects.edges} />
            </Container>
          );
        }}
      </Query>
    </>
  );
};
