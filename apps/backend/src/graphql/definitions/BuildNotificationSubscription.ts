import { invariant } from "@argos/util/invariant";
import gqlTag from "graphql-tag";

import type { AuthViewer } from "@/auth/payload";
import { Build } from "@/database/models/Build";
import {
  subscribeUserToBuild,
  unsubscribeUserFromBuild,
} from "@/database/services/build-notification-subscription";

import type { IResolvers } from "../__generated__/resolver-types";
import { forbidden, notFound, unauthenticated } from "../util";

const { gql } = gqlTag;

export const typeDefs = gql`
  input SubscribeToBuildInput {
    buildId: ID!
  }

  input UnsubscribeFromBuildInput {
    buildId: ID!
  }

  extend type Mutation {
    "Subscribe the current user to a build's notifications"
    subscribeToBuild(input: SubscribeToBuildInput!): Build!
    "Unsubscribe the current user from a build's notifications"
    unsubscribeFromBuild(input: UnsubscribeFromBuildInput!): Build!
  }
`;

async function getBuildForUser(
  buildId: string,
  auth: AuthViewer,
): Promise<Build> {
  const build = await Build.query()
    .findById(buildId)
    .withGraphFetched("project.account");

  if (!build) {
    throw notFound("Build not found");
  }

  invariant(build.project?.account);

  const permissions = await build.project.$getPermissions(auth);

  if (!permissions.includes("view")) {
    throw forbidden("You cannot access this build");
  }

  return build;
}

export const resolvers: IResolvers = {
  Mutation: {
    subscribeToBuild: async (_root, args, ctx) => {
      const { auth } = ctx;
      if (!auth) {
        throw unauthenticated();
      }
      const build = await getBuildForUser(args.input.buildId, auth);
      await subscribeUserToBuild({
        buildId: build.id,
        userId: auth.user.id,
      });
      return build;
    },
    unsubscribeFromBuild: async (_root, args, ctx) => {
      const { auth } = ctx;
      if (!auth) {
        throw unauthenticated();
      }
      const build = await getBuildForUser(args.input.buildId, auth);
      await unsubscribeUserFromBuild({
        buildId: build.id,
        userId: auth.user.id,
      });
      return build;
    },
  },
};
