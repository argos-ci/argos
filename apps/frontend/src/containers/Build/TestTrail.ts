import type { ApolloCache } from "@apollo/client";
import { invariant } from "@argos/util/invariant";

import { graphql, type DocumentType } from "@/gql";

import type { JWTData } from "../Auth";

graphql(`
  fragment Test_AuditTrailUser on User {
    id
    name
    slug
    avatar {
      ...AccountAvatarFragment
    }
  }
`);

const AuditTrailFragment = graphql(`
  fragment Test_AuditTrail on AuditTrail {
    id
    date
    action
    user {
      ...Test_AuditTrailUser
    }
  }
`);

const CurrentAccountQuery = graphql(`
  query AuditTrail_currentAccount($slug: String!) {
    account(slug: $slug) {
      ...Test_AuditTrailUser
    }
  }
`);

export function addAuditTrailEntry(args: {
  cache: ApolloCache;
  action: "files.ignored" | "files.unignored";
  testId: string;
  authPayload: JWTData;
}) {
  const { cache, action, testId, authPayload } = args;
  const testCacheId = cache.identify({
    __typename: "Test",
    id: testId,
  });
  if (!testCacheId) {
    return;
  }

  const user = cache.readQuery({
    query: CurrentAccountQuery,
    variables: { slug: authPayload.account.slug },
  })?.account;

  if (!user) {
    return;
  }

  invariant(user.__typename === "User");

  const trailRef = cache.writeFragment({
    fragment: AuditTrailFragment,
    fragmentName: "Test_AuditTrail",
    data: {
      __typename: "AuditTrail" as const,
      id: `local-audit-trail-${Date.now()}`,
      date: new Date().toISOString(),
      action,
      user,
    },
  });

  cache.modify({
    id: testCacheId,
    fields: {
      trails: (existingRefs) => {
        if (!trailRef) {
          return existingRefs;
        }
        const refId = cache.identify(trailRef);
        if (
          refId &&
          existingRefs.some(
            (ref: DocumentType<typeof AuditTrailFragment>) =>
              cache.identify(ref) === refId,
          )
        ) {
          return existingRefs;
        }
        return [...existingRefs, trailRef];
      },
    },
  });
}
