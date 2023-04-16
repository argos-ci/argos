import {
  ApolloClient,
  ApolloProvider as BaseApolloProvider,
  DocumentNode,
  InMemoryCache,
  OperationVariables,
  QueryHookOptions,
  QueryResult,
  TypedDocumentNode,
  useQuery as useApolloQuery,
} from "@apollo/client";
import { useMemo } from "react";

import { useAuthToken } from "./Auth";

const ApolloProvider = (props: {
  children: React.ReactNode;
  authToken: string | null;
}) => {
  const authorization = props.authToken ? `Bearer ${props.authToken}` : null;
  const apolloClient = useMemo(
    () =>
      new ApolloClient({
        uri: `/graphql`,
        cache: new InMemoryCache({
          possibleTypes: {
            Owner: ["User", "Organization"],
          },
        }),
        headers: authorization ? { authorization } : {},
      }),
    [authorization]
  );
  return (
    <BaseApolloProvider client={apolloClient}>
      {props.children}
    </BaseApolloProvider>
  );
};

export const ApolloInitializer = (props: { children: React.ReactNode }) => {
  const authToken = useAuthToken();
  return (
    <ApolloProvider authToken={authToken}>{props.children}</ApolloProvider>
  );
};

export function useQuery<
  TData = any,
  TVariables extends OperationVariables = OperationVariables
>(
  query: DocumentNode | TypedDocumentNode<TData, TVariables>,
  options?: QueryHookOptions<TData, TVariables>
): QueryResult<TData, TVariables> {
  const { loading, error, data, ...others } = useApolloQuery(query, options);
  if (error) {
    throw error;
  }
  return { loading, data, ...others };
}

export function Query<
  TData = any,
  TVariables extends OperationVariables = OperationVariables
>({
  fallback = null,
  children,
  query,
  ...options
}: {
  children: (
    data: NonNullable<QueryResult<TData, TVariables>["data"]>
  ) => React.ReactElement | null;
  fallback?: React.ReactElement | null;
  query: DocumentNode | TypedDocumentNode<TData, TVariables>;
  variables?: TVariables;
  skip?: boolean;
}): React.ReactElement | null {
  const { data } = useQuery(query, options);

  if (!data) {
    return fallback;
  }

  return children(data);
}
