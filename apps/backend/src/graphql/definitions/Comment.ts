import { invariant } from "@argos/util/invariant";
import type { JSONContent } from "@tiptap/core";
import gqlTag from "graphql-tag";

import { createBuildComment } from "@/comment/createBuildComment";
import { formatCommentId } from "@/comment/id";
import { Build } from "@/database/models/Build";

import type { IResolvers } from "../__generated__/resolver-types";
import { forbidden, notFound, unauthenticated } from "../util";

const { gql } = gqlTag;

export const typeDefs = gql`
  """
  A comment posted on a build.
  """
  type Comment implements Node {
    id: ID!
    "Date the comment was posted"
    date: DateTime!
    "Rich-text JSON content of the comment"
    content: JSONObject!
    "Author of the comment"
    user: User
  }

  input AddBuildCommentInput {
    buildId: ID!
    "Rich-text JSON content of the comment"
    body: JSONObject!
  }

  extend type Mutation {
    "Post a comment on a build"
    addBuildComment(input: AddBuildCommentInput!): Build!
  }
`;

export const resolvers: IResolvers = {
  Comment: {
    id: (comment) => formatCommentId(comment.id),
    date: (comment) => {
      return new Date(comment.createdAt);
    },
    content: (comment) => {
      return comment.content as Record<string, unknown>;
    },
    user: async (comment, _, ctx) => {
      if (!comment.userId) {
        return null;
      }
      const account = await ctx.loaders.AccountFromRelation.load({
        userId: comment.userId,
      });
      invariant(account, "Account not found");
      return account;
    },
  },
  Mutation: {
    addBuildComment: async (_root, args, ctx) => {
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
        throw forbidden("You cannot comment on this build");
      }

      await createBuildComment({
        build,
        userId: auth.user.id,
        body: input.body as JSONContent,
      });

      return build;
    },
  },
};
