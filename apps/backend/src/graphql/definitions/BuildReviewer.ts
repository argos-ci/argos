import { invariant } from "@argos/util/invariant";
import gqlTag from "graphql-tag";

import {
  addBuildReviewers,
  removeBuildReviewers,
} from "@/build/requestedReviewers";
import { Build } from "@/database/models/Build";
import { User } from "@/database/models/User";

import type { IResolvers } from "../__generated__/resolver-types";
import { forbidden, notFound, unauthenticated } from "../util";

const { gql } = gqlTag;

export const typeDefs = gql`
  input AddBuildReviewersInput {
    buildId: ID!
    "Public ids of the users to request as reviewers"
    userIds: [ID!]!
  }

  input RemoveBuildReviewersInput {
    buildId: ID!
    "Public ids of the users whose review request should be cancelled"
    userIds: [ID!]!
  }

  extend type Mutation {
    "Request users to review a build"
    addBuildReviewers(input: AddBuildReviewersInput!): Build!
    "Cancel review requests on a build"
    removeBuildReviewers(input: RemoveBuildReviewersInput!): Build!
  }
`;

/**
 * Load a build for a reviewer mutation, enforcing that the current user has the
 * `review` permission on its project. Never trust the client — the same check
 * gates who can see the picker in the UI.
 */
async function loadBuildForReviewerMutation(
  buildId: string,
  user: User,
): Promise<Build> {
  const build = await Build.query()
    .findById(buildId)
    .withGraphFetched("project.account");
  if (!build) {
    throw notFound("Build not found");
  }
  invariant(build.project?.account);
  const permissions = await build.project.$getPermissions(user);
  if (!permissions.includes("review")) {
    throw forbidden("You cannot request reviewers for this build");
  }
  return build;
}

export const resolvers: IResolvers = {
  Mutation: {
    addBuildReviewers: async (_root, args, ctx) => {
      const { auth } = ctx;
      if (!auth) {
        throw unauthenticated();
      }
      const build = await loadBuildForReviewerMutation(
        args.input.buildId,
        auth.user,
      );
      await addBuildReviewers({
        build,
        accountIds: args.input.userIds,
        requestedById: auth.user.id,
      });
      return build;
    },
    removeBuildReviewers: async (_root, args, ctx) => {
      const { auth } = ctx;
      if (!auth) {
        throw unauthenticated();
      }
      const build = await loadBuildForReviewerMutation(
        args.input.buildId,
        auth.user,
      );
      await removeBuildReviewers({
        build,
        accountIds: args.input.userIds,
      });
      return build;
    },
  },
};
