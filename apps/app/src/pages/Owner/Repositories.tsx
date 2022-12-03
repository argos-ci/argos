import { Helmet } from "react-helmet";
import { useParams } from "react-router-dom";

import { Query } from "@/containers/Apollo";
import { graphql } from "@/gql";
import { RepositoryList } from "@/modern/containers/RepositoryList";
import { Container } from "@/modern/ui/Container";
import { PageLoader } from "@/modern/ui/PageLoader";

import { useOwnerContext } from ".";
import { NotFound } from "../NotFound";

const OwnerQuery = graphql(`
  query OwnerRepositories_owner($login: String!) {
    owner(login: $login) {
      id
      repositories {
        id
        ...RepositoryList_repository
      }
    }
  }
`);

export const OwnerRepositories = () => {
  const { hasWritePermission } = useOwnerContext();
  const { ownerLogin } = useParams();

  if (!ownerLogin) {
    return null;
  }

  return (
    <>
      <Helmet>
        <title>{ownerLogin} • Repositories</title>
      </Helmet>
      <Query
        fallback={<PageLoader />}
        query={OwnerQuery}
        variables={{ login: ownerLogin }}
      >
        {({ owner }) => {
          if (!owner) return <NotFound />;

          return (
            <Container>
              <RepositoryList
                repositories={owner.repositories}
                hasWritePermission={hasWritePermission}
              />
            </Container>
          );
        }}
      </Query>
    </>
  );
};
