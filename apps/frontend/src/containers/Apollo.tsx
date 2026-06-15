import { useEffect, useMemo } from "react";
import {
  ApolloClient,
  ApolloLink,
  HttpLink,
  InMemoryCache,
} from "@apollo/client";
import { ErrorLink } from "@apollo/client/link/error";
import { RetryLink } from "@apollo/client/link/retry";
import { GraphQLWsLink } from "@apollo/client/link/subscriptions";
import { ApolloProvider as BaseApolloProvider } from "@apollo/client/react";
import { getMainDefinition } from "@apollo/client/utilities";
import { invariant } from "@argos/util/invariant";
import { createClient } from "graphql-ws";

import fragments from "@/gql-fragments.json";

import { logout } from "./Auth";

const ApolloProvider = (props: { children: React.ReactNode }) => {
  const apolloClient = useMemo(() => {
    const logoutLink = new ErrorLink(({ error }) => {
      if (error && "statusCode" in error && error.statusCode === 401) {
        logout();
      }
    });

    const httpLink = new HttpLink({
      uri: "/graphql",
      // Authenticate with the HttpOnly session cookie instead of a Bearer
      // token. The custom header satisfies CSRF protection (a cross-site page
      // cannot set it).
      credentials: "include",
      headers: { "x-argos-csrf": "1" },
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

    // Subscriptions ride a WebSocket; the HttpOnly session cookie is sent
    // automatically on the same-origin upgrade request, so no extra auth is
    // needed here. The client connects lazily on the first subscription.
    const wsLink = new GraphQLWsLink(
      createClient({
        url: () => {
          const url = new URL("/graphql", window.location.href);
          url.protocol = url.protocol === "https:" ? "wss:" : "ws:";
          return url.toString();
        },
      }),
    );

    // Route subscription operations over the WebSocket and everything else
    // through the HTTP chain.
    const link = ApolloLink.split(
      ({ query }) => {
        const definition = getMainDefinition(query);
        return (
          definition.kind === "OperationDefinition" &&
          definition.operation === "subscription"
        );
      },
      wsLink,
      ApolloLink.from([logoutLink, retryLink, httpLink]),
    );

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
          TestMetrics: {
            merge: false,
          },
        },
      }),
      link,
    });
  }, []);
  return (
    <BaseApolloProvider client={apolloClient}>
      {props.children}
    </BaseApolloProvider>
  );
};

export const ApolloInitializer = (props: { children: React.ReactNode }) => {
  return <ApolloProvider>{props.children}</ApolloProvider>;
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
