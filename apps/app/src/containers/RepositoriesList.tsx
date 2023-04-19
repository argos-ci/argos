import { graphql } from "@/gql";
import { Button } from "@/ui/Button";
import { Loader } from "@/ui/Loader";
import { Time } from "@/ui/Time";

import { Query } from "./Apollo";

const InstallationQuery = graphql(`
  query RepositoriesList_repository($installationId: ID!, $page: Int!) {
    ghApiInstallationRepositories(
      installationId: $installationId
      page: $page
    ) {
      edges {
        id
        name
        updated_at
        owner_login
      }
      pageInfo {
        hasNextPage
      }
    }
  }
`);

export const RepositoriesList = (props: {
  installationId: string;
  importRepo: (repo: { id: string; name: string; owner_login: string }) => void;
  disabled?: boolean;
}) => {
  return (
    <Query
      fallback={<Loader />}
      query={InstallationQuery}
      variables={{ installationId: props.installationId, page: 1 }}
    >
      {({ ghApiInstallationRepositories }) => {
        return (
          <div className="flex flex-col overflow-auto rounded border border-border">
            {ghApiInstallationRepositories.edges.map((repo) => (
              <div
                key={repo.id}
                className="flex items-center justify-between border-b border-border p-4 last:border-b-0"
              >
                <div>
                  {repo.name} •{" "}
                  <Time date={repo.updated_at} className="text-on-light" />
                </div>
                <Button
                  onClick={() => {
                    props.importRepo(repo);
                  }}
                  disabled={props.disabled}
                >
                  Import
                </Button>
              </div>
            ))}
          </div>
        );
      }}
    </Query>
  );
};
