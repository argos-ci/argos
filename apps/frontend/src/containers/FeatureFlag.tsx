import {
  BucketProps,
  BucketProvider,
  Features,
  useFeature,
} from "@bucketco/react-sdk";
import { Navigate, useParams } from "react-router-dom";

import { config } from "@/config";
import { graphql } from "@/gql";

import { useSafeQuery } from "./Apollo";
import { useAuthTokenPayload } from "./Auth";

declare module "@bucketco/react-sdk" {
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

type UserProviderProps = Omit<BucketProps, "publishableKey" | "user">;

/**
 * Slug of users where the Bucket toolbar is enabled.
 */
const BUCKET_TOOLBAR_ENABLED_FOR = ["gregberge", "jsfez"];

/**
 * Provides the user data to the BucketProvider.
 */
function UserProvider(props: UserProviderProps) {
  const payload = useAuthTokenPayload();
  return (
    <BucketProvider
      {...props}
      publishableKey={config.bucket.publishableKey}
      user={
        payload
          ? { id: payload.account.id, name: payload.account.name ?? undefined }
          : undefined
      }
      toolbar={
        process.env["NODE_ENV"] === "development" ||
        (payload?.account.slug
          ? BUCKET_TOOLBAR_ENABLED_FOR.includes(payload?.account.slug)
          : false)
      }
    />
  );
}

const AccountQuery = graphql(`
  query FeatureFlagProvider_account($slug: String!) {
    account(slug: $slug) {
      id
      name
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
  const { data } = useSafeQuery(AccountQuery, {
    variables: { slug: props.accountSlug },
  });

  if (!data) {
    return null;
  }

  return (
    <UserProvider
      {...props}
      company={
        data.account
          ? { id: data.account.id, name: data.account.name || undefined }
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
  featureKey: keyof Features;
}) {
  const feature = useFeature(props.featureKey);
  if (feature.isLoading) {
    return null;
  }
  if (!feature.isEnabled) {
    return <Navigate to="/" />;
  }
  return props.children;
}

/** @utility */
export function featureGuardHoc(featureKey: keyof Features) {
  return (Component: React.ComponentType) => (props: any) => (
    <FeatureGuard featureKey={featureKey}>
      <Component {...props} />
    </FeatureGuard>
  );
}
