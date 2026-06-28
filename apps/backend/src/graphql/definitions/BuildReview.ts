import type { BuildReviewEvent } from "@argos/schemas/build-review";
import { assertNever } from "@argos/util/assertNever";
import { invariant } from "@argos/util/invariant";
import type { JSONContent } from "@tiptap/core";
import gqlTag from "graphql-tag";

import {
  createBuildReview,
  ReviewState,
  ScreenshotDiffReviewState,
} from "@/build/createBuildReview";
import { dismissBuildReview } from "@/build/dismissBuildReview";
import {
  subscribeToReviewChanges,
  type ReviewChangeType,
} from "@/build/reviewEvents";
import { Build } from "@/database/models/Build";
import { BuildReview } from "@/database/models/BuildReview";

import {
  IBuildReviewEvent,
  IReviewChangeType,
  IReviewState,
  IScreenshotDiffReviewState,
  type IResolvers,
} from "../__generated__/resolver-types";
import { assertCanViewBuild } from "../buildAccess";
import { badUserInput, forbidden, notFound, unauthenticated } from "../util";

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
    dismissedAt: DateTime
    dismissedBy: User
    "Whether the review was submitted automatically on behalf of the user, because their previous approvals already matched all the changes."
    automatic: Boolean!
  }

  input CreateBuildReviewInput {
    buildId: ID!
    event: BuildReviewEvent!
    body: JSONObject
    screenshotDiffReviews: [ScreenshotDiffReviewInput!]!
  }

  input DismissReviewInput {
    reviewId: ID!
  }

  input ScreenshotDiffReviewInput {
    screenshotDiffId: ID!
    state: ScreenshotDiffReviewState!
  }

  extend type Mutation {
    createBuildReview(input: CreateBuildReviewInput!): Build!
    dismissReview(input: DismissReviewInput!): Build!
  }

  """
  How a review changed: it was newly submitted, or an existing one was
  dismissed.
  """
  enum ReviewChangeType {
    SUBMITTED
    DISMISSED
  }

  """
  A review that was submitted on or dismissed from a build, pushed live to
  subscribers.
  """
  type BuildReviewChangeEvent {
    "How the review changed"
    type: ReviewChangeType!
    "The review that changed"
    review: BuildReview!
  }

  extend type Subscription {
    "Emitted when a review is submitted on or dismissed from the given build"
    buildReviewChanged(buildId: ID!): BuildReviewChangeEvent!
  }
`;

/** Map the internal review-change type to its GraphQL enum value. */
const REVIEW_CHANGE_EVENT_TYPE: Record<ReviewChangeType, IReviewChangeType> = {
  SUBMITTED: IReviewChangeType.Submitted,
  DISMISSED: IReviewChangeType.Dismissed,
};

export const resolvers: IResolvers = {
  BuildReview: {
    date: (review) => {
      return new Date(review.createdAt);
    },
    dismissedAt: (review) => {
      return review.dismissedAt ? new Date(review.dismissedAt) : null;
    },
    dismissedBy: async (review, _, ctx) => {
      if (!review.dismissedById) {
        return null;
      }
      const account = await ctx.loaders.AccountFromRelation.load({
        userId: review.dismissedById,
      });
      invariant(account, "Account not found");
      return account;
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
        body: (input.body ?? undefined) as JSONContent | undefined,
        snapshotReviews: input.screenshotDiffReviews.map((diffReviewInput) => ({
          screenshotDiffId: diffReviewInput.screenshotDiffId,
          state: parseScreenshotDiffReviewState(diffReviewInput.state),
        })),
      });

      return build;
    },
    dismissReview: async (_root, args, ctx) => {
      const { auth } = ctx;
      if (!auth) {
        throw unauthenticated();
      }

      const review = await BuildReview.query()
        .findById(args.input.reviewId)
        .withGraphFetched("build.project.account");

      if (!review) {
        throw notFound("Review not found");
      }

      const { build } = review;
      if (!build) {
        throw notFound("Build not found");
      }

      invariant(build.project?.account);

      const permissions = await build.project.$getPermissions(auth.user);

      if (!permissions.includes("review_dismiss")) {
        throw forbidden("You cannot dismiss this review");
      }

      if (review.state === "pending") {
        throw badUserInput("You cannot dismiss a pending review");
      }

      if (review.dismissedAt) {
        throw badUserInput("Review already dismissed");
      }

      await dismissBuildReview({ review, build, dismissedById: auth.user.id });

      return build;
    },
  },
  Subscription: {
    buildReviewChanged: {
      // Authorize before opening the stream so an unpermitted subscription is
      // rejected upfront rather than after the first event.
      subscribe: async (_root, args, ctx) => {
        await assertCanViewBuild(args.buildId, ctx.auth?.user ?? null);
        return (async function* () {
          for await (const change of subscribeToReviewChanges(args.buildId)) {
            yield {
              buildReviewChanged: {
                type: REVIEW_CHANGE_EVENT_TYPE[change.type],
                review: change.review,
              },
            };
          }
        })();
      },
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
