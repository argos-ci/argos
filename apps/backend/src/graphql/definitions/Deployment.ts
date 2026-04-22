import gqlTag from "graphql-tag";

import { Build } from "@/database/models";
import { getDeploymentUrl } from "@/deployment/url";

import {
  IDeploymentAliasType,
  type IResolvers,
} from "../__generated__/resolver-types";
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

  enum DeploymentAliasType {
    branch
    domain
  }

  type DeploymentAlias {
    id: ID!
    type: DeploymentAliasType!
    url: String!
  }

  type Deployment implements Node {
    id: ID!
    createdAt: DateTime!
    status: DeploymentStatus!
    environment: DeploymentEnvironment!
    branch: String!
    commitSha: String!
    url: String!
    aliases: [DeploymentAlias!]!
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
    aliases: async (deployment, _args, ctx) => {
      const aliases = await ctx.loaders.DeploymentAliasesByDeploymentId.load(
        deployment.id,
      );
      return aliases.map((alias) => ({
        id: alias.id,
        type:
          alias.type === "domain"
            ? IDeploymentAliasType.Domain
            : IDeploymentAliasType.Branch,
        url:
          alias.type === "domain"
            ? new URL(`https://${alias.alias}`).href
            : getDeploymentUrl(alias.alias),
      }));
    },
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
