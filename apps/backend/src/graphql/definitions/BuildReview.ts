import type { BuildReviewEvent } from "@argos/schemas/build-review";
import { assertNever } from "@argos/util/assertNever";
import { invariant } from "@argos/util/invariant";
import gqlTag from "graphql-tag";

import {
  createBuildReview,
  ReviewState,
  ScreenshotDiffReviewState,
} from "@/build/createBuildReview";
import { Build } from "@/database/models/Build";

import {
  IBuildReviewEvent,
  IReviewState,
  IScreenshotDiffReviewState,
  type IResolvers,
} from "../__generated__/resolver-types";
import { forbidden, notFound, unauthenticated } from "../util";

const { gql } = gqlTag;

export const typeDefs = gql`
  """
  The state of a build review.
  """
  enum ReviewState {
    "Reviewer approved the changes"
    APPROVED
    "Reviewer rejected changes"
    REJECTED
    "Reviewer left a neutral review comment"
    COMMENTED
    "The review was dismissed"
    DISMISSED
    "The review was created but not submitted yet"
    PENDING
  }

  """
  The event used to submit a build review.
  """
  enum BuildReviewEvent {
    "Approve the changes"
    APPROVE
    "Reject the changes"
    REJECT
    "Submit a neutral comment review"
    COMMENT
  }

  """
  The state of an individual screenshot diff review.
  """
  enum ScreenshotDiffReviewState {
    APPROVED
    REJECTED
  }

  type BuildReview implements Node {
    id: ID!
    date: DateTime!
    user: User
    state: ReviewState!
  }

  input CreateBuildReviewInput {
    buildId: ID!
    event: BuildReviewEvent!
    body: JSONObject
    screenshotDiffReviews: [ScreenshotDiffReviewInput!]!
  }

  input ScreenshotDiffReviewInput {
    screenshotDiffId: ID!
    state: ScreenshotDiffReviewState!
  }

  extend type Mutation {
    createBuildReview(input: CreateBuildReviewInput!): Build!
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
    createBuildReview: async (_root, args, ctx) => {
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
        event: parseEvent(input.event),
        body: input.body ?? undefined,
        snapshotReviews: input.screenshotDiffReviews.map((diffReviewInput) => ({
          screenshotDiffId: diffReviewInput.screenshotDiffId,
          state: parseScreenshotDiffReviewState(diffReviewInput.state),
        })),
      });

      return build;
    },
  },
};

function parseEvent(event: IBuildReviewEvent): BuildReviewEvent {
  switch (event) {
    case IBuildReviewEvent.Approve:
      return "APPROVE";
    case IBuildReviewEvent.Reject:
      return "REJECT";
    case IBuildReviewEvent.Comment:
      return "COMMENT";
    default:
      assertNever(event);
  }
}

function formatState(state: ReviewState): IReviewState {
  switch (state) {
    case "approved":
      return IReviewState.Approved;
    case "rejected":
      return IReviewState.Rejected;
    case "commented":
      return IReviewState.Commented;
    case "dismissed":
      return IReviewState.Dismissed;
    case "pending":
      return IReviewState.Pending;
    default:
      assertNever(state);
  }
}

function parseScreenshotDiffReviewState(
  state: IScreenshotDiffReviewState,
): ScreenshotDiffReviewState {
  switch (state) {
    case IScreenshotDiffReviewState.Approved:
      return "approved";
    case IScreenshotDiffReviewState.Rejected:
      return "rejected";
    default:
      assertNever(state);
  }
}
