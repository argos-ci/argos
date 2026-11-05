import type { ProjectTokenPermission } from "@argos/schemas/project-token";
import { addDays } from "@argos/util/date";
import { invariant } from "@argos/util/invariant";
import gqlTag from "graphql-tag";

import { Project, type Account, type User } from "@/database/models";
import {
  canManageProjectToken,
  createProjectToken,
  deleteProjectToken,
  filterViewableProjects,
  listAccountProjectTokens,
  listProjectProjectTokens,
  loadProjectToken,
  renameProjectToken,
} from "@/database/services/project-token";
import { loadAccountById } from "@/database/services/team-member";
import { boom } from "@/util/error";

import {
  IProjectTokenPermission,
  type IResolvers,
} from "../__generated__/resolver-types";
import { toGraphQLError, unauthenticated } from "../util";

const { gql } = gqlTag;

export const typeDefs = gql`
  enum ProjectTokenPermission {
    builds_write
    deployments_write
    projects_read
    media_read
    media_write
  }

  "A token CI and the SDK authenticate with, linked to projects of an account."
  type ProjectToken implements Node {
    id: ID!
    name: String!
    createdAt: DateTime!
    expireAt: DateTime
    lastUsedAt: DateTime
    permissions: [ProjectTokenPermission!]!
    "The live projects of the account the token reaches"
    projects: [Project!]!
    "The user who created the token, null for a migrated legacy token"
    createdBy: User
    "Whether the viewer can rename and revoke the token"
    viewerCanManage: Boolean!
  }

  type CreateProjectTokenPayload {
    projectToken: ProjectToken!
    "The token value, only returned once at creation"
    token: String!
    "The account owning the token, to refresh its list"
    account: Account!
  }

  input CreateProjectTokenInput {
    accountId: ID!
    name: String!
    projectIds: [ID!]!
    permissions: [ProjectTokenPermission!]!
    expireInDays: Int
  }

  input UpdateProjectTokenInput {
    id: ID!
    name: String!
  }

  input DeleteProjectTokenInput {
    id: ID!
  }

  extend interface Account {
    "The account's project tokens, null when the viewer is not an administrator"
    projectTokens: [ProjectToken!]
  }

  extend type Team {
    projectTokens: [ProjectToken!]
  }

  extend type User {
    projectTokens: [ProjectToken!]
  }

  extend type Project {
    "The tokens linked to the project, null when the viewer cannot review it"
    tokens: [ProjectToken!]
  }

  extend type Mutation {
    "Create a project token"
    createProjectToken(
      input: CreateProjectTokenInput!
    ): CreateProjectTokenPayload!
    "Rename a project token"
    updateProjectToken(input: UpdateProjectTokenInput!): ProjectToken!
    "Revoke a project token, returning its id"
    deleteProjectToken(input: DeleteProjectTokenInput!): ID!
  }
`;

const PERMISSION_TO_GRAPHQL = {
  "builds:write": IProjectTokenPermission.BuildsWrite,
  "deployments:write": IProjectTokenPermission.DeploymentsWrite,
  "projects:read": IProjectTokenPermission.ProjectsRead,
  "media:read": IProjectTokenPermission.MediaRead,
  "media:write": IProjectTokenPermission.MediaWrite,
} satisfies Record<ProjectTokenPermission, IProjectTokenPermission>;

const PERMISSION_FROM_GRAPHQL = {
  [IProjectTokenPermission.BuildsWrite]: "builds:write",
  [IProjectTokenPermission.DeploymentsWrite]: "deployments:write",
  [IProjectTokenPermission.ProjectsRead]: "projects:read",
  [IProjectTokenPermission.MediaRead]: "media:read",
  [IProjectTokenPermission.MediaWrite]: "media:write",
} satisfies Record<IProjectTokenPermission, ProjectTokenPermission>;

async function resolveAccountProjectTokens(
  account: Account,
  user: User | undefined,
) {
  if (!user) {
    throw unauthenticated();
  }
  return listAccountProjectTokens({ account, user });
}

export const resolvers: IResolvers = {
  ProjectToken: {
    permissions: (projectToken) =>
      projectToken.permissions.map(
        (permission) => PERMISSION_TO_GRAPHQL[permission],
      ),
    projects: async (projectToken, _args, ctx) => {
      if (!ctx.auth) {
        throw unauthenticated();
      }
      const [account, projects] = await Promise.all([
        ctx.loaders.Account.load(projectToken.accountId),
        ctx.loaders.ProjectTokenProjects.load(projectToken.id),
      ]);
      invariant(account, "Project token account not found");
      return filterViewableProjects({ projects, account, user: ctx.auth.user });
    },
    createdBy: async (projectToken, _args, ctx) => {
      if (!projectToken.createdById) {
        return null;
      }
      return ctx.loaders.AccountFromRelation.load({
        userId: projectToken.createdById,
      });
    },
    viewerCanManage: async (projectToken, _args, ctx) => {
      if (!ctx.auth) {
        return false;
      }
      const [account, projects] = await Promise.all([
        ctx.loaders.Account.load(projectToken.accountId),
        ctx.loaders.ProjectTokenProjects.load(projectToken.id),
      ]);
      invariant(account, "Project token account not found");
      return canManageProjectToken({
        account,
        projects,
        user: ctx.auth.user,
      });
    },
  },
  Team: {
    projectTokens: (account, _args, ctx) =>
      resolveAccountProjectTokens(account, ctx.auth?.user),
  },
  User: {
    projectTokens: (account, _args, ctx) =>
      resolveAccountProjectTokens(account, ctx.auth?.user),
  },
  Project: {
    tokens: async (project, _args, ctx) => {
      if (!ctx.auth) {
        throw unauthenticated();
      }
      return listProjectProjectTokens({ project, user: ctx.auth.user });
    },
  },
  Mutation: {
    createProjectToken: async (_root, args, ctx) => {
      if (!ctx.auth) {
        throw unauthenticated();
      }
      const { accountId, name, projectIds, permissions, expireInDays } =
        args.input;
      try {
        const [account, projects] = await Promise.all([
          loadAccountById(accountId),
          Project.queryNotDeleted().findByIds(projectIds),
        ]);
        if (projects.length !== new Set(projectIds).size) {
          throw boom(404, "Project not found.");
        }
        const created = await createProjectToken({
          account,
          user: ctx.auth.user,
          name,
          projects,
          permissions: permissions.map(
            (permission) => PERMISSION_FROM_GRAPHQL[permission],
          ),
          expireAt:
            expireInDays != null
              ? addDays(new Date(), expireInDays).toISOString()
              : null,
        });
        return { ...created, account };
      } catch (error) {
        throw toGraphQLError(error);
      }
    },
    updateProjectToken: async (_root, args, ctx) => {
      if (!ctx.auth) {
        throw unauthenticated();
      }
      try {
        const projectToken = await loadProjectToken({ id: args.input.id });
        return await renameProjectToken({
          projectToken,
          user: ctx.auth.user,
          name: args.input.name,
        });
      } catch (error) {
        throw toGraphQLError(error);
      }
    },
    deleteProjectToken: async (_root, args, ctx) => {
      if (!ctx.auth) {
        throw unauthenticated();
      }
      try {
        const projectToken = await loadProjectToken({ id: args.input.id });
        await deleteProjectToken({ projectToken, user: ctx.auth.user });
        return projectToken.id;
      } catch (error) {
        throw toGraphQLError(error);
      }
    },
  },
};
