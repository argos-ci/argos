import { useEffect, useMemo } from "react";
import {
  ApolloClient,
  ApolloLink,
  HttpLink,
  InMemoryCache,
} from "@apollo/client";
import { ErrorLink } from "@apollo/client/link/error";
import { RetryLink } from "@apollo/client/link/retry";
import { ApolloProvider as BaseApolloProvider } from "@apollo/client/react";
import { invariant } from "@argos/util/invariant";

import fragments from "@/gql-fragments.json";

import { logout, useAuthToken } from "./Auth";

const ApolloProvider = (props: {
  children: React.ReactNode;
  authToken: string | null;
}) => {
  const authorization = props.authToken ? `Bearer ${props.authToken}` : null;
  const apolloClient = useMemo(() => {
    const logoutLink = new ErrorLink(({ error }) => {
      if (error && "statusCode" in error && error.statusCode === 401) {
        logout();
      }
    });

    const httpLink = new HttpLink({
      uri: "/graphql",
      headers: authorization ? { authorization } : {},
    });

    const retryLink = new RetryLink({
      attempts: {
        retryIf: (error: unknown) => {
          if (
            error instanceof Error &&
            "statusCode" in error &&
            typeof error.statusCode === "number" &&
            error.statusCode >= 400 &&
            error.statusCode < 500
          ) {
            return false;
          }
          return true;
        },
      },
    });

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
