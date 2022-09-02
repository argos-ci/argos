import * as React from "react";
import {
  ApolloClient,
  InMemoryCache,
  useQuery as useApolloQuery,
  ApolloProvider as BaseApolloProvider,
} from "@apollo/client";
import { useAuthToken } from "./Auth";

function ApolloProvider({ children, authToken }) {
  const authorization = authToken ? `Bearer ${authToken}` : null;
  const apolloClient = React.useMemo(
    () =>
      new ApolloClient({
        uri: `/graphql`,
        cache: new InMemoryCache({
          possibleTypes: {
            Owner: ["User", "Organization"],
          },
        }),
        headers: {
          authorization,
        },
      }),
    [authorization]
  );
  return (
    <BaseApolloProvider client={apolloClient}>{children}</BaseApolloProvider>
  );
}

export function ApolloInitializer({ children }) {
  const authToken = useAuthToken();
  return <ApolloProvider authToken={authToken}>{children}</ApolloProvider>;
}

export function useQuery(query, options) {
  const { loading, error, data, ...others } = useApolloQuery(query, options);
  if (error) {
    throw error;
  }
  return { loading, data, ...others };
}

export function Query({ fallback = null, children, query, ...props }) {
  const { data } = useQuery(query, props);

  if (!data) {
    return fallback;
  }

  return children(data);
}
