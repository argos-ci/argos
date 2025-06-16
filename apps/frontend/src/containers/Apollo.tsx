import { useEffect, useMemo } from "react";
import {
  ApolloClient,
  ApolloLink,
  ApolloProvider as BaseApolloProvider,
  DocumentNode,
  HttpLink,
  InMemoryCache,
  OperationVariables,
  QueryHookOptions,
  QueryResult,
  TypedDocumentNode,
  useQuery,
} from "@apollo/client";
import { onError } from "@apollo/client/link/error";
import { RetryLink } from "@apollo/client/link/retry";
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

    const retryLink = new RetryLink();

    return new ApolloClient({
      dataMasking: false,
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
      link: ApolloLink.from([logoutLink, retryLink, httpLink]),
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

export function useSafeQuery<
  TData = any,
  TVariables extends OperationVariables = OperationVariables,
>(
  query: DocumentNode | TypedDocumentNode<TData, TVariables>,
  options?: QueryHookOptions<TData, TVariables>,
): Omit<QueryResult<TData, TVariables>, "error"> {
  const { loading, error, data, ...others } = useQuery(query, options);
  if (error) {
    throw error;
  }
  return { loading, data, ...others };
}

/**
 * A hook that refetches data when the document becomes visible or the window gains focus.
 */
export function useRefetchWhenActive(props: {
  refetch: () => void;
  skip?: boolean;
}) {
  const { refetch, skip = false } = props;
  useEffect(() => {
    if (skip) {
      return;
    }

    function handleVisibilityChange() {
      if (document.visibilityState === "visible") {
        refetch();
      }
    }

    function handleFocus() {
      refetch();
    }

    document.addEventListener("visibilitychange", handleVisibilityChange);
    window.addEventListener("focus", handleFocus);

    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      window.removeEventListener("focus", handleFocus);
    };
  }, [refetch, skip]);
}
