import { gql } from "graphql-tag";
import { Helmet } from "react-helmet";
import { Navigate, Route, Routes, useParams } from "react-router-dom";

import { TabList, TabNavLink } from "@argos-ci/app/src/components";

import { Query } from "../../containers/Apollo";
import { HeaderTeleporter } from "../../containers/AppHeader";
import { NotFoundWithContainer } from "../NotFound";
import { RepositoryBuilds } from "./Builds";
import { GettingStarted } from "./GettingStarted";
import { RepositorySettings } from "./Settings";

const REPOSITORY_QUERY = gql`
  query REPOSITORY_QUERY($ownerLogin: String!, $repositoryName: String!) {
    repository(ownerLogin: $ownerLogin, repositoryName: $repositoryName) {
      id
      name
      token
      enabled
      permissions
      baselineBranch
      defaultBranch
      owner {
        login
        name
      }
      sampleBuildId
      builds(first: 5, after: 0) {
        pageInfo {
          totalCount
          endCursor
          hasNextPage
        }
        edges {
          id
          number
          status
          createdAt
        }
      }
    }
  }
`;

function hasWritePermission(repository) {
  return repository.permissions.includes("write");
}

export function Repository() {
  const { ownerLogin, repositoryName } = useParams();

  return (
    <>
      <Helmet>
        <title>
          {ownerLogin} / {repositoryName}
        </title>
      </Helmet>

      <Query
        query={REPOSITORY_QUERY}
        variables={{ ownerLogin: ownerLogin, repositoryName: repositoryName }}
        skip={!ownerLogin || !repositoryName}
      >
        {(data) => {
          if (!data?.repository) return <NotFoundWithContainer />;

          return (
            <>
              <HeaderTeleporter>
                <TabList>
                  <TabNavLink to={`builds`}>Builds</TabNavLink>
                  {hasWritePermission(data.repository) ? (
                    <TabNavLink to={`settings`}>Settings</TabNavLink>
                  ) : null}
                </TabList>
              </HeaderTeleporter>

              <Routes>
                <Route
                  path={"builds"}
                  element={<RepositoryBuilds repository={data.repository} />}
                />
                <Route index element={<Navigate to="builds" replace />} />
                <Route
                  path={`getting-started`}
                  element={<GettingStarted repository={data.repository} />}
                />
                {hasWritePermission(data.repository) ? (
                  <Route
                    path={`settings`}
                    element={
                      <RepositorySettings repository={data.repository} />
                    }
                  />
                ) : null}
                <Route path="*" element={<NotFoundWithContainer />} />
              </Routes>
            </>
          );
        }}
      </Query>
    </>
  );
}
