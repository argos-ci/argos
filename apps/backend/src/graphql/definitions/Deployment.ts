import gqlTag from "graphql-tag";

import { Build } from "@/database/models";

import type { IResolvers } from "../__generated__/resolver-types";
import { formatDeploymentId } from "../services/deployment";

const { gql } = gqlTag;

export const typeDefs = gql`
  enum DeploymentStatus {
    pending
    ready
    error
  }

  enum DeploymentEnvironment {
    preview
    production
  }

  type Deployment implements Node {
    id: ID!
    createdAt: DateTime!
    status: DeploymentStatus!
    environment: DeploymentEnvironment!
    branch: String!
    commitSha: String!
    url: String!
    pullRequest: PullRequest
    build: Build
  }

  type DeploymentConnection implements Connection {
    pageInfo: PageInfo!
    edges: [Deployment!]!
  }
`;

export const resolvers: IResolvers = {
  Deployment: {
    id: (deployment) => formatDeploymentId(deployment.id),
    build: async (deployment) => {
      const build = await Build.query()
        .joinRelated("compareScreenshotBucket")
        .where("builds.projectId", deployment.projectId)
        .where((query) => {
          query
            .where("builds.prHeadCommit", deployment.commitSha)
            .orWhere("compareScreenshotBucket.commit", deployment.commitSha);
        })
        .orderBy([
          { column: "builds.createdAt", order: "desc" },
          { column: "builds.id", order: "desc" },
        ])
        .first();
      return build ?? null;
    },
    pullRequest: async (deployment, _args, ctx) => {
      if (!deployment.githubPullRequestId) {
        return null;
      }
      return ctx.loaders.GithubPullRequest.load(deployment.githubPullRequestId);
    },
  },
};
