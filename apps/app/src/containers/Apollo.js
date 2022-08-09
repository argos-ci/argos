import React from "react";
import ApolloClient from "apollo-boost";
import {
  useQuery as useApolloQuery,
  ApolloProvider as BaseApolloProvider,
} from "@apollo/react-hooks";
import { useAuthToken } from "./Auth";

function ApolloProvider({ children, authToken }) {
  const authorization = authToken ? `Bearer ${authToken}` : null;
  const apolloClient = React.useMemo(
    () =>
      new ApolloClient({
        uri: `/graphql`,
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
  const { loading, data } = useQuery(query, props);

  if (loading) {
    return fallback;
  }

  return children(data);
}
