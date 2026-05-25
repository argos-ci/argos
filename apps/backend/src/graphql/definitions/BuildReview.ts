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
import { Build } from "@/database/models/Build";
import { BuildReview } from "@/database/models/BuildReview";
import { User } from "@/database/models/User";
import { sendNotification } from "@/notification";

import {
  IBuildReviewEvent,
  IReviewState,
  IScreenshotDiffReviewState,
  type IResolvers,
} from "../__generated__/resolver-types";
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
`;

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

      await review.$query().patch({
        dismissedAt: new Date().toISOString(),
        dismissedById: auth.user.id,
      });

      await notifyReviewDismissed({
        review,
        build,
        dismissedById: auth.user.id,
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

async function notifyReviewDismissed(input: {
  review: BuildReview;
  build: Build;
  dismissedById: string;
}): Promise<void> {
  const { review, build, dismissedById } = input;
  const { state } = review;
  if (state !== "approved" && state !== "rejected" && state !== "commented") {
    return;
  }
  if (!review.userId || review.userId === dismissedById) {
    return;
  }
  const project = build.project;
  invariant(project?.account, "project account not found");
  const [dismissedBy, buildUrl] = await Promise.all([
    User.query().findById(dismissedById).withGraphFetched("account"),
    build.getUrl(),
  ]);
  const dismissedByName = dismissedBy?.account?.displayName ?? null;
  await sendNotification({
    type: "review_dismissed",
    data: {
      accountSlug: project.account.slug,
      projectName: project.name,
      buildNumber: build.number,
      buildName: build.name,
      buildUrl,
      dismissedByName,
      state,
    },
    recipients: [review.userId],
  });
}
