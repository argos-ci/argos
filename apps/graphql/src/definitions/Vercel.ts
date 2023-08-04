import gqlTag from "graphql-tag";

import config from "@argos-ci/config";
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
  VercelApiProject,
  createVercelClient,
  retrieveToken,
} from "@argos-ci/vercel";

import {
  IResolvers,
  IVercelApiProjectStatus,
} from "../__generated__/resolver-types.js";
import { forbidden } from "../util.js";

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
    project: Project
  }

  type VercelApiPagination {
    count: Int!
    next: ID
    prev: ID
  }

  type VercelConfiguration {
    id: ID!
    vercelId: ID!
    url: String!
    apiProjects: VercelApiProjectConnection
  }

  type VercelProject {
    id: ID!
    configuration: VercelConfiguration!
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
      vercelTeamId: input.vercelTeamId,
    });
  };

  const vercelConfiguration = await getOrCreateVercelConfiguration();

  await account
    .$query()
    .patch({ vercelConfigurationId: vercelConfiguration.id });

  return vercelConfiguration;
};

export const linkVercelProject = async (input: {
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

  const project = await Project.query()
    .joinRelated("githubRepository")
    .findOne({
      "githubRepository.githubId": link.repoId,
    });
  return project ?? null;
};

export const resolvers: IResolvers = {
  VercelApiProjectLink: {
    __resolveType: (obj) => {
      if (obj.type === "github") {
        return "VercelApiProjectLinkGithub";
      }
      return "VercelApiProjectLinkOther";
    },
  },
  VercelApiProject: {
    status: async (vercelProject, args, ctx) => {
      if (!ctx.auth) {
        throw forbidden();
      }

      const link = vercelProject.link;

      if (!link) {
        return IVercelApiProjectStatus.NoProvider;
      }

      if (link.type !== "github") {
        return IVercelApiProjectStatus.ProviderNotSupported;
      }

      if (!link.org || !link.repo || !link.repoId) {
        return IVercelApiProjectStatus.NoProvider;
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
          return IVercelApiProjectStatus.RequireGithubAccess;
        }

        return IVercelApiProjectStatus.ReadyForLink;
      }

      if (project.accountId !== args.accountId) {
        return IVercelApiProjectStatus.LinkedToOtherTeam;
      }

      return IVercelApiProjectStatus.Linked;
    },
    linkedProject: async (vercelProject, _args, ctx) => {
      if (!ctx.auth) {
        throw forbidden();
      }
      return getLinkedProject(vercelProject);
    },
    project: async (vercelProject, _args, ctx) => {
      if (!ctx.auth) {
        throw forbidden();
      }
      return ctx.loaders.ProjectFromVercelProject.load(vercelProject.id);
    },
  },
  VercelConfiguration: {
    url: () => {
      // For now it is easier to just go to integration, the user will manage to find the settings
      // in order to redirect to the settings page we have to find the team slug...
      // two API requests just for an URL it does not worth it
      return config.get("vercel.integrationUrl");
    },
    apiProjects: async (configuration) => {
      if (!configuration.vercelAccessToken) return null;
      const client = createVercelClient({
        accessToken: configuration.vercelAccessToken,
      });
      const projects = await client.listProjects({
        teamId: configuration.vercelTeamId,
        limit: 100,
      });
      return projects;
    },
  },
  VercelProject: {
    configuration: async (project) => {
      const configuration = await project
        .$relatedQuery("activeConfiguration")
        .orderBy("id", "desc")
        .first();
      if (!configuration) {
        throw new Error("Vercel configuration not found");
      }
      return configuration;
    },
  },
  Query: {
    vercelApiTeam: async (_root, { accessToken, id }) => {
      const client = createVercelClient({ accessToken });
      return client.getTeam(id);
    },
    vercelApiProjects: async (_root, { accessToken, teamId, limit }) => {
      const client = createVercelClient({ accessToken });
      const projects = await client.listProjects({ teamId, limit });
      return projects;
    },
  },
  Mutation: {
    retrieveVercelToken: async (_root, { code }) => {
      const token = await retrieveToken(code);
      return token;
    },
    setupVercelIntegration: async (_root, args, ctx) => {
      if (!ctx.auth) {
        throw forbidden();
      }

      const vercelConfiguration = await linkVercelConfiguration({
        vercelAccessToken: args.input.vercelAccessToken,
        vercelConfigurationId: args.input.vercelConfigurationId,
        vercelTeamId: args.input.vercelTeamId ?? null,
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
