import { useEffect } from "react";

import config from "@/config";
import { Query } from "@/containers/Apollo";
import { useIsLoggedIn } from "@/containers/Auth";
import { RepositoryList } from "@/containers/RepositoryList";
import { DocumentType, graphql } from "@/gql";
import { Alert, AlertActions, AlertText, AlertTitle } from "@/ui/Alert";
import { Button } from "@/ui/Button";
import { Container } from "@/ui/Container";
import { PageLoader } from "@/ui/PageLoader";

const OwnersQuery = graphql(`
  query Home_owners {
    owners {
      id
      repositories {
        id
        enabled
        ...RepositoryList_repository
      }
    }
  }
`);

type OwnersQueryDocument = DocumentType<typeof OwnersQuery>;

function Owners(props: { owners: OwnersQueryDocument["owners"] }) {
  const repositories = props.owners.flatMap((owner) =>
    owner.repositories.map((repository) => repository)
  );

  if (!repositories.length) {
    return (
      <Container>
        <Alert>
          <AlertTitle>No repository found</AlertTitle>
          <AlertText>
            Adds your first repository to start using Argos.
          </AlertText>
          <AlertActions>
            <Button>
              {(buttonProps) => (
                <a {...buttonProps} href={config.get("github.appUrl")}>
                  Give access to your repositories
                </a>
              )}
            </Button>
          </AlertActions>
        </Alert>
      </Container>
    );
  }

  return (
    <Container>
      <RepositoryList repositories={repositories} hasWritePermission />
    </Container>
  );
}

const RedirectToWww = () => {
  useEffect(() => {
    window.location.replace("https://www.argos-ci.com");
  }, []);
  return null;
};

export const Home = () => {
  const loggedIn = useIsLoggedIn();

  if (!loggedIn) {
    if (process.env["NODE_ENV"] !== "production") {
      return (
        <div className="container mx-auto p-4 text-center">
          Not logged in, in production you would be redirected to
          www.argos-ci.com.
        </div>
      );
    }
    return <RedirectToWww />;
  }

  return (
    <Query fallback={<PageLoader />} query={OwnersQuery}>
      {({ owners }) => <Owners owners={owners} />}
    </Query>
  );
};
