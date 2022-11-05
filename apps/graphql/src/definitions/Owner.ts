import gqlTag from "graphql-tag";
import type { QueryBuilder } from "objection";

import { Account, Organization, User } from "@argos-ci/database/models";
import type { Repository } from "@argos-ci/database/models";

import type { Context } from "../context.js";

// eslint-disable-next-line import/no-named-as-default-member
const { gql } = gqlTag;

export const typeDefs = gql`
  enum OwnerType {
    organization
    user
  }

  interface Owner {
    id: ID!
    name: String!
    login: String!
    type: OwnerType!
    repositoriesNumber: Int!
    repositories(enabled: Boolean): [Repository!]!
    consumptionRatio: Float
    permissions: [Permission]!
    currentMonthUsedScreenshots: Int!
    plan: Plan
    screenshotsLimitPerMonth: Int
  }

  type Organization implements Owner {
    id: ID!
    name: String!
    login: String!
    type: OwnerType!
    repositoriesNumber: Int!
    repositories(enabled: Boolean): [Repository!]!
    consumptionRatio: Float
    permissions: [Permission]!
    currentMonthUsedScreenshots: Int!
    plan: Plan
    screenshotsLimitPerMonth: Int
  }

  extend type Query {
    "Get owners"
    owners: [Owner!]!
    "Get owner"
    owner(login: String!): Owner
  }
`;

type Owner = Organization | User;

const sortByLogin = (a: Owner, b: Owner) => (a.login < b.login ? -1 : 1);

export const getOwner = async ({
  login,
}: {
  login: string;
}): Promise<Owner | null> => {
  const organization = await Organization.query().findOne({ login });

  if (organization) {
    return organization;
  }

  const user = await User.query().findOne({ login });

  if (user) {
    return user;
  }

  return null;
};

function addEnableFilter({
  enabled,
  query,
}: {
  enabled: boolean;
  query: QueryBuilder<Repository>;
}) {
  const enabledQuery = query
    .leftJoin("builds", "repositories.id", "builds.repositoryId")
    .groupBy("repositories.id");

  return enabled
    ? enabledQuery.havingRaw("count(builds.id) > 0")
    : enabledQuery.havingRaw("count(builds.id) = 0");
}

const getOwnerRepositories = (
  owner: Owner,
  { user, enabled }: { user?: User | null; enabled?: boolean | undefined } = {}
) => {
  if (!user) {
    const repositoriesQuery = owner
      .$relatedQuery<Repository>("repositories")
      .where({
        private: false,
        [`repositories.${owner.type()}Id`]: owner.id,
      })
      .orderBy("repositories.name", "asc");

    if (enabled !== undefined) {
      return addEnableFilter({ enabled, query: repositoriesQuery });
    }

    return repositoriesQuery;
  }

  const repositoriesQuery = owner
    .$relatedQuery<Repository>("repositories")
    .select("repositories.*")
    .whereIn("repositories.id", (builder) =>
      builder
        .select("repositories.id")
        .from("repositories")
        .leftJoin(
          "user_repository_rights",
          "user_repository_rights.repositoryId",
          "repositories.id"
        )
        .where((builder) => {
          builder.where({ private: false }).orWhere({
            "user_repository_rights.userId": user.id,
            private: true,
            [`repositories.${owner.type()}Id`]: owner.id,
          });
        })
    )
    .orderBy("repositories.name", "asc");

  if (enabled !== undefined) {
    return addEnableFilter({ enabled, query: repositoriesQuery });
  }

  return repositoriesQuery;
};

const getOwnerAccount = async (owner: Owner) => {
  return Account.getAccount({ [`${owner.type()}Id`]: owner.id });
};

export const resolvers = {
  Owner: {
    __resolveType: (owner: Owner) => {
      switch (owner.constructor.name) {
        case "User":
          return "User";
        case "Organization":
          return "Organization";
        default:
          throw new Error(`Unknown owner type "${owner.constructor.name}"`);
      }
    },
    name: (owner: Owner) => owner.name || owner.login,
    repositories: async (
      owner: Owner,
      args: { enabled?: boolean },
      ctx: Context
    ) => {
      return getOwnerRepositories(owner, {
        user: ctx.user,
        enabled: args.enabled,
      });
    },
    permissions: async (
      owner: Owner,
      _args: Record<string, never>,
      ctx: Context
    ) => {
      if (!ctx.user) return ["read"];
      const hasWritePermission = owner.$checkWritePermission(ctx.user);
      return hasWritePermission ? ["read", "write"] : ["read"];
    },
    consumptionRatio: async (owner: Owner) => {
      const account = await getOwnerAccount(owner);
      return account.getScreenshotsConsumptionRatio();
    },
    repositoriesNumber: async (
      owner: Owner,
      _args: Record<string, never>,
      ctx: Context
    ) => {
      const [result] = await getOwnerRepositories(owner, {
        user: ctx.user,
        // @TODO add missing enabled filter here
        // enabled: args.enabled,
      }).count("repositories.*");
      return (result as unknown as { count: number }).count;
    },
    currentMonthUsedScreenshots: async (owner: Owner) => {
      const account = await getOwnerAccount(owner);
      return account.getScreenshotsCurrentConsumption();
    },
    plan: async (owner: Owner) => {
      const account = await getOwnerAccount(owner);
      return account.getPlan();
    },
    screenshotsLimitPerMonth: async (owner: Owner) => {
      const account = await getOwnerAccount(owner);
      return account.getScreenshotsMonthlyLimit();
    },
  },
  Query: {
    owners: async (_root: null, _args: Record<string, never>, ctx: Context) => {
      if (!ctx.user) return [];

      const [organizations, users] = await Promise.all([
        ctx.user.$relatedQuery("organizations"),
        User.query()
          .distinct("users.id")
          .select("users.*")
          .innerJoin("repositories", "repositories.userId", "users.id")
          .innerJoin(
            "user_repository_rights",
            "user_repository_rights.repositoryId",
            "repositories.id"
          )
          .where("user_repository_rights.userId", ctx.user.id)
          .whereNot("users.id", ctx.user.id),
      ]);

      const owners = [...organizations, ...users].sort(sortByLogin);

      return [ctx.user, ...owners];
    },
    owner: async (_root: null, args: { login: string }, ctx: Context) => {
      const owner = await getOwner({ login: args.login });
      if (!owner) return null;
      // @TODO use a request to count the number of repositories
      const ownerRepositories = await getOwnerRepositories(owner, {
        user: ctx.user,
        enabled: ctx.user ? undefined : true,
      });
      return ownerRepositories.length === 0 ? null : owner;
    },
  },
};
