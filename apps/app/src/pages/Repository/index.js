import React from "react";
import { Helmet } from "react-helmet";
import { gql } from "graphql-tag";
import { Navigate, Route, Routes, useParams } from "react-router-dom";
import { TabList, TabNavLink } from "@argos-ci/app/src/components";
import { RepositoryBuilds } from "./Builds";
import { RepositorySettings } from "./Settings";
import { Build } from "../Build";
import { GettingStarted } from "./GettingStarted";
import { NotFound } from "../NotFound";
import { HeaderTeleporter } from "../../containers/AppNavbar";
import { Query } from "../../containers/Apollo";

const REPOSITORY_QUERY = gql`
  query repository($ownerLogin: String!, $repositoryName: String!) {
    repository(ownerLogin: $ownerLogin, repositoryName: $repositoryName) {
      id
      name
      token
      enabled
      permissions
      baselineBranch
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
      <Helmet
        titleTemplate={`%s • ${ownerLogin} / ${repositoryName}`}
        defaultTitle={`${ownerLogin} / ${repositoryName}`}
      />

      <Query
        query={REPOSITORY_QUERY}
        variables={{ ownerLogin: ownerLogin, repositoryName: repositoryName }}
        skip={!ownerLogin || !repositoryName}
      >
        {(data) => {
          if (!data?.repository) return <NotFound />;

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
                <Route path={`builds/:buildNumber`} element={<Build />} />
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
                <Route path="*" element={<NotFound />} />
              </Routes>
            </>
          );
        }}
      </Query>
    </>
  );
}
