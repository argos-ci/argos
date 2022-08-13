import React from "react";
import { gql } from "graphql-tag";
import { useMutation } from "@apollo/client";

export const RepositoryContextFragment = gql`
  fragment RepositoryContextFragment on Repository {
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
`;

const RepositoryContext = React.createContext();

export function RepositoryProvider({
  repository: initialRepository,
  children,
}) {
  const [repository, setRepository] = React.useState(initialRepository);
  const [
    toggleRepository,
    { loading: queryLoading, error: queryError, data: updateData },
  ] = useMutation(gql`
    mutation toggleRepository($enabled: Boolean!, $repositoryId: String!) {
      toggleRepository(enabled: $enabled, repositoryId: $repositoryId) {
        ...RepositoryContextFragment
      }
    }
    ${RepositoryContextFragment}
  `);
  React.useEffect(() => {
    if (updateData && updateData.toggleRepository) {
      setRepository(updateData.toggleRepository);
    }
  }, [queryError, queryLoading, updateData]);
  const value = React.useMemo(
    () => ({
      repository,
      toggleRepository,
      queryLoading,
      queryError,
    }),
    [queryError, queryLoading, repository, toggleRepository]
  );
  return (
    <RepositoryContext.Provider value={value}>
      {children}
    </RepositoryContext.Provider>
  );
}

export function useRepository() {
  const { repository } = React.useContext(RepositoryContext);
  return repository;
}

export function useToggleRepository() {
  const {
    toggleRepository,
    queryLoading: loading,
    queryError: error,
  } = React.useContext(RepositoryContext);
  return { toggleRepository, loading, error };
}
