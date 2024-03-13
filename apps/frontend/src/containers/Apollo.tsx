import { useMemo } from "react";
import {
  ApolloClient,
  ApolloProvider as BaseApolloProvider,
  DocumentNode,
  HttpLink,
  InMemoryCache,
  OperationVariables,
  QueryHookOptions,
  QueryResult,
  TypedDocumentNode,
  useQuery as useApolloQuery,
} from "@apollo/client";
import { onError } from "@apollo/client/link/error";
import { invariant } from "@apollo/client/utilities/globals";

import fragments from "@/gql-fragments.json";

import { logout, useAuthToken } from "./Auth";

const ApolloProvider = (props: {
  children: React.ReactNode;
  authToken: string | null;
}) => {
  const authorization = props.authToken ? `Bearer ${props.authToken}` : null;
  const apolloClient = useMemo(() => {
    const logoutLink = onError(({ networkError }) => {
      if (
        networkError &&
        "statusCode" in networkError &&
        networkError.statusCode === 401
      ) {
        logout();
      }
    });

    const httpLink = new HttpLink({
      uri: "/graphql",
      headers: authorization ? { authorization } : {},
    });

    return new ApolloClient({
      cache: new InMemoryCache({
        possibleTypes: fragments.possibleTypes,
        typePolicies: {
          Team: {
            keyFields: (obj) => {
              invariant(obj.id, "Team.id is undefined");
              return `Account:${obj.id}`;
            },
          },
          User: {
            keyFields: (obj) => {
              invariant(obj.id, "User.id is undefined");
              return `Account:${obj.id}`;
            },
          },
        },
      }),
      link: logoutLink.concat(httpLink),
    });
  }, [authorization]);
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
  TVariables extends OperationVariables = OperationVariables,
>(
  query: DocumentNode | TypedDocumentNode<TData, TVariables>,
  options?: QueryHookOptions<TData, TVariables>,
): QueryResult<TData, TVariables> {
  const { loading, error, data, ...others } = useApolloQuery(query, options);
  if (error) {
    throw error;
  }
  return { loading, data, ...others };
}

export function Query<
  TData = any,
  TVariables extends OperationVariables = OperationVariables,
>({
  fallback = null,
  children,
  query,
  ...options
}: {
  children: (
    data: NonNullable<QueryResult<TData, TVariables>["data"]>,
  ) => React.ReactElement | null;
  fallback?: React.ReactElement | null;
  query: DocumentNode | TypedDocumentNode<TData, TVariables>;
  variables?: TVariables;
  skip?: boolean;
}): React.ReactElement | null {
  const { data, previousData } = useQuery(query, options);

  const dataOrPreviousData = data || previousData;

  if (!dataOrPreviousData) {
    return fallback;
  }

  return children(dataOrPreviousData);
}
