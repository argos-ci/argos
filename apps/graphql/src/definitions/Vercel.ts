import gqlTag from "graphql-tag";

import {
  Account,
  Project,
  User,
  VercelConfiguration,
  VercelProject,
  VercelProjectConfiguration,
} from "@argos-ci/database/models";
import { getTokenOctokit } from "@argos-ci/github";
import {
  VercelProject as VercelApiProject,
  createVercelClient,
  retrieveToken,
} from "@argos-ci/vercel";

import type { Context } from "../context.js";

const { gql } = gqlTag;

export const typeDefs = gql`
  type VercelApiToken {
    access_token: String!
    installation_id: String!
    user_id: String!
    team_id: String
  }

  type VercelApiTeam {
    id: ID!
    slug: String!
    name: String!
  }

  interface VercelApiProjectLink {
    type: String!
  }

  type VercelApiProjectLinkGithub implements VercelApiProjectLink {
    type: String!
    org: String!
    repo: String!
    repoId: Int!
  }

  type VercelApiProjectLinkOther implements VercelApiProjectLink {
    type: String!
  }

  enum VercelApiProjectStatus {
    LINKED
    LINKED_TO_OTHER_TEAM
    READY_FOR_LINK
    REQUIRE_GITHUB_ACCESS
    PROVIDER_NOT_SUPPORTED
    NO_PROVIDER
    UNKNOWN_ERROR
  }

  type VercelApiProject {
    id: ID!
    name: String!
    link: VercelApiProjectLink
    status(accountId: ID!): VercelApiProjectStatus!
    linkedProject: Project
  }

  type VercelApiPagination {
    count: Int!
    next: ID
    prev: ID
  }

  type VercelApiProjectConnection {
    projects: [VercelApiProject!]!
    pagination: VercelApiPagination!
  }

  input SetupVercelIntegrationProjectInput {
    projectId: ID!
    vercelProjectId: ID!
  }

  input SetupVercelIntegrationInput {
    vercelAccessToken: String!
    vercelConfigurationId: ID!
    vercelTeamId: ID
    accountId: ID!
    projects: [SetupVercelIntegrationProjectInput!]!
  }

  extend type Mutation {
    "Retrieve a Vercel API token from a code"
    retrieveVercelToken(code: String!): VercelApiToken!
    "Finish the Vercel integration setup"
    setupVercelIntegration(input: SetupVercelIntegrationInput!): Boolean
  }

  extend type Query {
    "Get a Vercel Team From API"
    vercelApiTeam(accessToken: String!, id: ID!): VercelApiTeam
    "Get Vercel projects from API"
    vercelApiProjects(
      accessToken: String!
      teamId: ID
      limit: Int
    ): VercelApiProjectConnection!
  }
`;

const linkVercelConfiguration = async (input: {
  vercelAccessToken: string;
  vercelConfigurationId: string;
  vercelTeamId: string | null;
  accountId: string;
  creator: User;
}) => {
  const client = createVercelClient({ accessToken: input.vercelAccessToken });

  const account = await Account.query()
    .findById(input.accountId)
    .throwIfNotFound();

  if (!account.$checkWritePermission(input.creator)) {
    throw new Error("Unauthorized");
  }

  const getOrCreateVercelConfiguration = async () => {
    const configuration = await VercelConfiguration.query().findOne({
      vercelId: input.vercelConfigurationId,
    });
    if (configuration) {
      return configuration;
    }
    await client
      .getConfiguration(input.vercelConfigurationId, input.vercelTeamId)
      .then((configuration) => {
        if (!configuration) {
          throw new Error("Vercel configuration not found");
        }
        return configuration;
      });
    return VercelConfiguration.query().insertAndFetch({
      vercelId: input.vercelConfigurationId,
      vercelAccessToken: input.vercelAccessToken,
    });
  };

  const vercelConfiguration = await getOrCreateVercelConfiguration();

  await account
    .$query()
    .patch({ vercelConfigurationId: vercelConfiguration.id });

  return vercelConfiguration;
};

const linkVercelProject = async (input: {
  vercelProjectId: string;
  projectId: string;
  vercelAccessToken: string;
  vercelConfiguration: VercelConfiguration;
  creator: User;
}) => {
  const { projectId, vercelAccessToken, vercelProjectId, vercelConfiguration } =
    input;

  const client = createVercelClient({ accessToken: vercelAccessToken });

  const project = await Project.query().findById(projectId).throwIfNotFound();

  if (!project.$checkWritePermission(input.creator)) {
    throw new Error("Unauthorized");
  }

  const getOrCreateVercelProject = async () => {
    const vercelProject = await VercelProject.query().findOne({
      vercelId: vercelProjectId,
    });
    if (vercelProject) {
      return vercelProject;
    }
    client.findProject(vercelProjectId).then((project) => {
      if (!project) {
        throw new Error("Vercel project not found");
      }
      return project;
    });
    return VercelProject.query().insertAndFetch({
      vercelId: vercelProjectId,
    });
  };

  const vercelProject = await getOrCreateVercelProject();

  const linkVercelProjectToConfiguration = async (
    vercelProjectId: string,
    vercelConfigurationId: string
  ) => {
    const link = await VercelProjectConfiguration.query().findOne({
      vercelProjectId,
      vercelConfigurationId,
    });
    if (link) {
      return link;
    }
    return VercelProjectConfiguration.query().insertAndFetch({
      vercelProjectId,
      vercelConfigurationId,
    });
  };

  await linkVercelProjectToConfiguration(
    vercelProject.id,
    vercelConfiguration.id
  );

  await project.$query().patch({ vercelProjectId: vercelProject.id });
};

const getLinkedProject = async (vercelProject: VercelApiProject) => {
  const { link } = vercelProject;
  if (!link) {
    return null;
  }

  if (link.type !== "github") {
    return null;
  }

  if (!link.org || !link.repo || !link.repoId) {
    return null;
  }

  return Project.query().joinRelated("githubRepository").findOne({
    "githubRepository.githubId": link.repoId,
  });
};

export const resolvers = {
  VercelApiProjectLink: {
    __resolveType: (obj: any) => {
      if (obj.type === "github") {
        return "VercelApiProjectLinkGithub";
      }
      return "VercelApiProjectLinkOther";
    },
  },
  VercelApiProject: {
    status: async (
      vercelProject: VercelApiProject,
      args: { accountId: string },
      ctx: Context
    ) => {
      if (!ctx.auth) {
        throw new Error("Forbidden");
      }

      const link = vercelProject.link;

      if (!link) {
        return "NO_PROVIDER";
      }

      if (link.type !== "github") {
        return "PROVIDER_NOT_SUPPORTED";
      }

      if (!link.org || !link.repo || !link.repoId) {
        return "NO_PROVIDER";
      }

      const project = await Project.query()
        .joinRelated("githubRepository")
        .findOne({
          "githubRepository.githubId": link.repoId,
        });

      if (!project) {
        const octokit = getTokenOctokit(ctx.auth.user.accessToken);
        const ghApiRepo = await octokit.repos
          .get({
            owner: link.org,
            repo: link.repo,
          })
          .then((res) => res.data);

        if (!ghApiRepo) {
          return "REQUIRE_GITHUB_ACCESS";
        }

        return "READY_FOR_LINK";
      }

      if (project.accountId !== args.accountId) {
        return "LINKED_TO_OTHER_TEAM";
      }

      return "LINKED";
    },
    linkedProject: async (
      vercelProject: VercelApiProject,
      _args: never,
      ctx: Context
    ) => {
      if (!ctx.auth) {
        throw new Error("Forbidden");
      }
      return getLinkedProject(vercelProject);
    },
  },
  Query: {
    vercelApiTeam: async (
      _root: never,
      { accessToken, id }: { accessToken: string; id: string }
    ) => {
      const client = createVercelClient({ accessToken });
      const team = await client.getTeam(id);
      console.log(team);
      return team;
    },
    vercelApiProjects: async (
      _root: never,
      {
        accessToken,
        teamId,
        limit,
      }: { accessToken: string; teamId?: string; limit: number }
    ) => {
      const client = createVercelClient({ accessToken });
      const projects = await client.listProjects({ teamId, limit });
      console.log(projects);
      return projects;
    },
  },
  Mutation: {
    retrieveVercelToken: async (_root: never, { code }: { code: string }) => {
      const token = await retrieveToken(code);
      console.log(token);
      return token;
    },
    setupVercelIntegration: async (
      _root: never,
      args: {
        input: {
          vercelAccessToken: string;
          vercelConfigurationId: string;
          vercelTeamId: string | null;
          accountId: string;
          projects: {
            projectId: string;
            vercelProjectId: string;
          }[];
        };
      },
      ctx: Context
    ) => {
      if (!ctx.auth) {
        throw new Error("Forbidden");
      }

      const vercelConfiguration = await linkVercelConfiguration({
        vercelAccessToken: args.input.vercelAccessToken,
        vercelConfigurationId: args.input.vercelConfigurationId,
        vercelTeamId: args.input.vercelTeamId,
        accountId: args.input.accountId,
        creator: ctx.auth.user,
      });

      for (const { projectId, vercelProjectId } of args.input.projects) {
        await linkVercelProject({
          vercelConfiguration,
          vercelAccessToken: args.input.vercelAccessToken,
          vercelProjectId,
          projectId,
          creator: ctx.auth.user,
        });
      }

      return true;
    },
  },
};
