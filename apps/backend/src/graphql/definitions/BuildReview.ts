import { assertNever } from "@argos/util/assertNever";
import { invariant } from "@argos/util/invariant";
import gqlTag from "graphql-tag";

import { triggerAndRunAutomation } from "@/automation/index.js";
import { AutomationEvents } from "@/automation/types/events.js";
import { pushBuildNotification } from "@/build-notification/notifications.js";
import { Build } from "@/database/models/Build.js";
import { BuildReview } from "@/database/models/BuildReview.js";
import { ScreenshotDiffReview } from "@/database/models/ScreenshotDiffReview.js";
import { transaction } from "@/database/transaction.js";

import {
  IReviewState,
  type IResolvers,
} from "../__generated__/resolver-types.js";
import { forbidden, notFound, unauthenticated } from "../util.js";

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

      const buildReview = await transaction(async (trx) => {
        const buildReview = await BuildReview.query(trx).insert({
          buildId: build.id,
          userId: auth.user.id,
          state: parseState(input.state),
        });
        await ScreenshotDiffReview.query(trx).insert(
          input.screenshotDiffReviews.map((diffReviewInput) => ({
            screenshotDiffId: diffReviewInput.screenshotDiffId,
            buildReviewId: buildReview.id,
            state: parseState(diffReviewInput.state),
          })),
        );

        return buildReview;
      });

      // That might be better suited into a $afterUpdate hook.
      await Promise.all([
        pushBuildNotification({
          buildId: build.id,
          type: {
            [IReviewState.Approved]: "diff-accepted" as const,
            [IReviewState.Rejected]: "diff-rejected" as const,
          }[input.state],
        }),
        triggerAndRunAutomation({
          projectId: build.projectId,
          event: AutomationEvents.BuildReviewed,
          payload: { build, buildReview },
        }),
      ]);

      return build;
    },
  },
};

function parseState(state: IReviewState): "approved" | "rejected" {
  switch (state) {
    case IReviewState.Approved:
      return "approved";
    case IReviewState.Rejected:
      return "rejected";
    default:
      assertNever(state);
  }
}

function formatState(state: "approved" | "rejected"): IReviewState {
  switch (state) {
    case "approved":
      return IReviewState.Approved;
    case "rejected":
      return IReviewState.Rejected;
    default:
      assertNever(state);
  }
}
