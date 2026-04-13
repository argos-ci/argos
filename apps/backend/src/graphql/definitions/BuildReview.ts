import { assertNever } from "@argos/util/assertNever";
import { invariant } from "@argos/util/invariant";
import gqlTag from "graphql-tag";

import { createBuildReview, ReviewState } from "@/build/createBuildReview";
import { Build } from "@/database/models/Build";

import { IReviewState, type IResolvers } from "../__generated__/resolver-types";
import { forbidden, notFound, unauthenticated } from "../util";

const { gql } = gqlTag;

export const typeDefs = gql`
  enum ReviewState {
    APPROVED
    REJECTED
  }

  type BuildReview implements Node {
    id: ID!
    date: DateTime!
    user: User
    state: ReviewState!
  }

  input ReviewBuildInput {
    buildId: ID!
    state: ReviewState!
    screenshotDiffReviews: [ScreenshotDiffReviewInput!]!
  }

  input ScreenshotDiffReviewInput {
    screenshotDiffId: ID!
    state: ReviewState!
  }

  extend type Mutation {
    reviewBuild(input: ReviewBuildInput!): Build!
  }
`;

export const resolvers: IResolvers = {
  BuildReview: {
    date: (review) => {
      return new Date(review.createdAt);
    },
    state: (review) => {
      return formatState(review.state);
    },
    user: async (review, _, ctx) => {
      if (!review.userId) {
        return null;
      }
      const account = await ctx.loaders.AccountFromRelation.load({
        userId: review.userId,
      });
      invariant(account, "Account not found");
      return account;
    },
  },
  Mutation: {
    reviewBuild: async (_root, args, ctx) => {
      const { auth } = ctx;
      if (!auth) {
        throw unauthenticated();
      }

      const { input } = args;

      const build = await Build.query()
        .findById(input.buildId)
        .withGraphFetched("project.account");

      if (!build) {
        throw notFound("Build not found");
      }

      invariant(build.project?.account);

      const permissions = await build.project.$getPermissions(auth.user);

      if (!permissions.includes("review")) {
        throw forbidden("You cannot approve or reject this build");
      }

      await createBuildReview({
        build,
        userId: auth.user.id,
        state: parseState(input.state),
        snapshotReviews: input.screenshotDiffReviews.map((diffReviewInput) => ({
          screenshotDiffId: diffReviewInput.screenshotDiffId,
          state: parseState(diffReviewInput.state),
        })),
      });

      return build;
    },
  },
};

function parseState(state: IReviewState): ReviewState {
  switch (state) {
    case IReviewState.Approved:
      return "approved";
    case IReviewState.Rejected:
      return "rejected";
    default:
      assertNever(state);
  }
}

function formatState(state: ReviewState): IReviewState {
  switch (state) {
    case "approved":
      return IReviewState.Approved;
    case "rejected":
      return IReviewState.Rejected;
    default:
      assertNever(state);
  }
}
