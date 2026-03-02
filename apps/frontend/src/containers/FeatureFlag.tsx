import { useQuery } from "@apollo/client/react";
import {
  ReflagProps,
  ReflagProvider,
  useFlag,
  type CompanyContext,
  type Flags,
} from "@reflag/react-sdk";
import { Navigate, useParams } from "react-router-dom";

import { config } from "@/config";
import { graphql } from "@/gql";

import { useAuthTokenPayload } from "./Auth";

declare module "@reflag/react-sdk" {
  interface Features {
    "changes-ignore": boolean;
  }
}

export function FeatureFlagProvider(props: { children: React.ReactNode }) {
  const params = useParams();

  if (params.accountSlug) {
    return (
      <CompanyAndUserProvider accountSlug={params.accountSlug}>
        {props.children}
      </CompanyAndUserProvider>
    );
  }

  return <UserProvider>{props.children}</UserProvider>;
}

type UserProviderProps = Omit<ReflagProps, "publishableKey" | "context"> & {
  company?: CompanyContext;
};

/**
 * Slug of users where the Reflag toolbar is enabled.
 */
const REFLAG_TOOLBAR_ENABLED_FOR = ["gregberge", "jsfez"];

/**
 * Provides the user data to the ReflagProvider.
 */
function UserProvider(props: UserProviderProps) {
  const { company, ...rest } = props;
  const payload = useAuthTokenPayload();
  return (
    <ReflagProvider
      {...rest}
      publishableKey={config.bucket.publishableKey}
      context={{
        company,
        user: payload
          ? { id: payload.account.id, name: payload.account.name ?? undefined }
          : undefined,
      }}
      toolbar={
        process.env["NODE_ENV"] === "development" ||
        (payload?.account.slug
          ? REFLAG_TOOLBAR_ENABLED_FOR.includes(payload?.account.slug)
          : false)
      }
    />
  );
}

const AccountQuery = graphql(`
  query FeatureFlagProvider_account($accountSlug: String!) {
    account(slug: $accountSlug) {
      id
      name
      slug
    }
  }
`);

/**
 * Fetches the account data and provides it to the BucketProvider.
 */
function CompanyAndUserProvider(
  props: {
    accountSlug: string;
  } & Omit<UserProviderProps, "company">,
) {
  const { accountSlug, ...rest } = props;
  const { data, error } = useQuery(AccountQuery, {
    variables: { accountSlug },
  });

  if (error) {
    throw error;
  }

  if (!data) {
    return null;
  }

  return (
    <UserProvider
      {...rest}
      company={
        data.account
          ? {
              id: data.account.id,
              name: data.account.name || data.account.slug || undefined,
            }
          : undefined
      }
    />
  );
}

/**
 * A guard that checks if a feature is enabled.
 * If the feature is not enabled, it redirects to the home page.
 */
function FeatureGuard(props: {
  children: React.ReactNode;
  flagKey: keyof Flags;
}) {
  const feature = useFlag(props.flagKey);
  if (feature.isLoading) {
    return null;
  }
  if (!feature.isEnabled) {
    return <Navigate to="/" />;
  }
  return props.children;
}

/** @utility */
export function featureGuardHoc(flagKey: keyof Flags) {
  return (Component: React.ComponentType) => (props: any) => (
    <FeatureGuard flagKey={flagKey}>
      <Component {...props} />
    </FeatureGuard>
  );
}
