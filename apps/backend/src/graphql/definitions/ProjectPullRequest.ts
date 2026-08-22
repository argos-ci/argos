import gqlTag from "graphql-tag";

import {
  GithubPullRequest,
  type OriginPullRequest,
  type Project,
} from "@/database/models";
import {
  queryProjectPullRequests,
  queryPullRequestBuilds,
} from "@/project/pull-requests";

import type { IResolvers } from "../__generated__/resolver-types";

const { gql } = gqlTag;

export const typeDefs = gql`
  """
  A pull request as one project sees it: the pull request itself plus the
  activity — builds and media — that this project has on it. Pull requests have
  no page of their own; this is the row of the project's pull request list.
  """
  type ProjectPullRequest implements Node {
    id: ID!
    pullRequest: PullRequest!
    "Builds of this pull request in this project, most recent first (capped)"
    builds: [Build!]!
    "Media published to this pull request in this project, oldest first"
    medias: [Media!]!
  }

  type ProjectPullRequestConnection implements Connection {
    pageInfo: PageInfo!
    edges: [ProjectPullRequest!]!
  }

  extend type Project {
    "Pull requests with builds or media in this project, most recently seen first"
    pullRequests(after: Int = 0, first: Int = 30): ProjectPullRequestConnection!
  }
`;

export type ProjectPullRequestObject = {
  id: string;
  project: Project;
  pullRequest: GithubPullRequest | OriginPullRequest;
};

/**
 * Identify the (project, pull request) pair. The pull request's own id is not
 * enough: projects sharing a repository share its pull request rows while each
 * sees its own builds and media, and the two providers' ids come from separate
 * sequences.
 */
function formatProjectPullRequestId(
  project: Project,
  pullRequest: GithubPullRequest | OriginPullRequest,
): string {
  const provider =
    pullRequest instanceof GithubPullRequest ? "github" : "origin";
  return [provider, project.id, pullRequest.id].join(":");
}

export const resolvers: IResolvers = {
  Project: {
    pullRequests: async (project, args) => {
      const { first, after } = args;
      const result = await queryProjectPullRequests({
        projectId: project.id,
        after,
        first,
      });
      return {
        pageInfo: {
          hasNextPage: result.hasNextPage,
          isEmpty: after === 0 && result.pullRequests.length === 0,
          // Counting runs a second pass over both providers' tables, so only
          // pay for it when the field is requested (graphql-js invokes
          // function properties lazily in its default resolver).
          totalCount: result.getTotalCount as unknown as number,
        },
        edges: result.pullRequests.map((pullRequest) => ({
          id: formatProjectPullRequestId(project, pullRequest),
          project,
          pullRequest,
        })),
      };
    },
  },
  ProjectPullRequest: {
    builds: async (node) => {
      return queryPullRequestBuilds({
        projectId: node.project.id,
        pullRequest: node.pullRequest,
      });
    },
    medias: async (node, _args, ctx) => {
      // Standalone media only attaches to GitHub pull requests.
      if (!(node.pullRequest instanceof GithubPullRequest)) {
        return [];
      }
      const membershipPermissions =
        await ctx.loaders.ProjectMembershipPermissions.load({
          project: node.project,
          user: ctx.auth?.user ?? null,
        });
      return ctx.loaders.PullRequestMedia.load({
        projectId: node.project.id,
        githubPullRequestId: node.pullRequest.id,
        // Same rule as the share page's sidebar: without membership on the
        // project only the public media show — a public project grants anyone
        // "view", which must not open its team-only uploads to the world.
        includeTeamOnly: membershipPermissions.includes("view"),
      });
    },
  },
};
