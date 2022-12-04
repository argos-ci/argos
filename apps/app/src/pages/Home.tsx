import { useEffect } from "react";

import config from "@/config";
import { Query } from "@/containers/Apollo";
import { useUser } from "@/containers/User";
import { DocumentType, graphql } from "@/gql";
import { RepositoryList } from "@/modern/containers/RepositoryList";
import { Alert, AlertActions, AlertText, AlertTitle } from "@/modern/ui/Alert";
import { Button } from "@/modern/ui/Button";
import { Container } from "@/modern/ui/Container";
import { PageLoader } from "@/modern/ui/PageLoader";
import { isUserSyncing } from "@/modules/user";

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
  const user = useUser();

  if (!user) {
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

  if (!user.installations.length && !isUserSyncing(user)) {
    return (
      <Container>
        <Alert>
          <AlertTitle>Missing installation</AlertTitle>
          <AlertText>
            It looks like Argos GitHub application is not installed on your
            account.
          </AlertText>
          <AlertActions>
            <Button>
              {(buttonProps) => (
                <a {...buttonProps} href={config.get("github.appUrl")}>
                  Install Argos GitHub App
                </a>
              )}
            </Button>
          </AlertActions>
        </Alert>
      </Container>
    );
  }

  return (
    <Query fallback={<PageLoader />} query={OwnersQuery}>
      {({ owners }) => <Owners owners={owners} />}
    </Query>
  );
};
