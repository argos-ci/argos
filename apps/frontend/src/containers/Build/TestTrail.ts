import type { ApolloCache } from "@apollo/client";
import { invariant } from "@argos/util/invariant";

import { graphql, type DocumentType } from "@/gql";
import { UserType } from "@/gql/graphql";

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
      ...UserCard_user
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
  accountSlug: string;
  projectName: string;
}) {
  const { cache, action, testId, authPayload, accountSlug, projectName } = args;
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
    // `role` is keyed on these args, so the optimistic entry must be written
    // under the same variables the activity query reads with.
    variables: { accountSlug, projectName },
    data: {
      __typename: "AuditTrail" as const,
      id: `local-audit-trail-${Date.now()}`,
      date: new Date().toISOString(),
      action,
      user: {
        ...user,
        // The actor ignoring a change is always the signed-in person, never a
        // bot. Presence/role aren't known locally; the card tolerates nulls and
        // the next fetch fills them in.
        type: UserType.User,
        role: null,
        lastSeenAt: new Date().toISOString(),
        timezone: null,
      },
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
