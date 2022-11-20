import {
  ApolloClient,
  ApolloProvider as BaseApolloProvider,
  DocumentNode,
  InMemoryCache,
  useQuery as useApolloQuery,
} from "@apollo/client";
import { useMemo } from "react";

import { useAuthToken } from "./Auth";

function ApolloProvider({
  children,
  authToken,
}: {
  children: React.ReactNode;
  authToken: string | null;
}) {
  const authorization = authToken ? `Bearer ${authToken}` : null;
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
    <BaseApolloProvider client={apolloClient}>{children}</BaseApolloProvider>
  );
}

export function ApolloInitializer({ children }: { children: React.ReactNode }) {
  const authToken = useAuthToken();
  return <ApolloProvider authToken={authToken}>{children}</ApolloProvider>;
}

export const useQuery: typeof useApolloQuery = (query, options) => {
  const { loading, error, data, ...others } = useApolloQuery(query, options);
  if (error) {
    throw error;
  }
  return { loading, data, ...others };
};

export const Query = ({
  fallback = null,
  children,
  query,
  ...props
}: {
  children: (data: any) => React.ReactNode;
  fallback?: React.ReactNode;
  query: DocumentNode;
}) => {
  const { data } = useQuery(query, props);

  if (!data) {
    return fallback;
  }

  return children(data);
};
