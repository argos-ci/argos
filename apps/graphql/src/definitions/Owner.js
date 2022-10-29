import { gql } from "graphql-tag";

import { Account, Organization, User } from "@argos-ci/database/models";

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

const sortByLogin = (a, b) => (a.login < b.login ? -1 : 1);

export async function getOwner({ login }) {
  let owner = await Organization.query().where({ login }).first();

  if (owner) {
    return owner;
  }

  owner = await User.query().where({ login }).first();

  if (owner) {
    return owner;
  }

  return null;
}

function addEnableFilter({ enabled, query }) {
  const enabledQuery = query
    .leftJoin("builds", "repositories.id", "builds.repositoryId")
    .groupBy("repositories.id");

  return enabled
    ? enabledQuery.havingRaw("count(builds.id) > 0")
    : enabledQuery.havingRaw("count(builds.id) = 0");
}

function getOwnerRepositories(owner, { user, enabled } = {}) {
  if (!user) {
    const repositoriesQuery = owner
      .$relatedQuery("repositories")
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
    .$relatedQuery("repositories")
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
    return addEnableFilter({ enabled, query: repositoriesQuery }).debug();
  }

  return repositoriesQuery;
}

async function getOwnerAccount(owner) {
  return Account.getAccount({ [`${owner.type()}Id`]: owner.id });
}

export const resolvers = {
  Owner: {
    __resolveType: (owner) => {
      switch (owner.constructor.name) {
        case "User":
          return "User";
        case "Organization":
          return "Organization";
        default:
          throw new Error(`Unknown owner type "${owner.constructor.name}"`);
      }
    },
    name: (owner) => owner.name || owner.login,
    async repositories(owner, args, context) {
      return getOwnerRepositories(owner, {
        user: context.user,
        enabled: args.enabled,
      });
    },
    async permissions(owner, args, context) {
      const hasWritePermission = owner.$checkWritePermission(context.user);
      return hasWritePermission ? ["read", "write"] : ["read"];
    },
    async consumptionRatio(owner) {
      const account = await getOwnerAccount(owner);
      return account.getScreenshotsConsumptionRatio();
    },
    async repositoriesNumber(owner, args, context) {
      const [{ count }] = await getOwnerRepositories(owner, {
        user: context.user,
        enabled: args.enabled,
      }).count("repositories.*");
      return count;
    },
    async currentMonthUsedScreenshots(owner) {
      const account = await getOwnerAccount(owner);
      return account.getScreenshotsCurrentConsumption();
    },
    async plan(owner) {
      const account = await getOwnerAccount(owner);
      return account.getPlan();
    },
    async screenshotsLimitPerMonth(owner) {
      const account = await getOwnerAccount(owner);
      return account.getScreenshotsMonthlyLimit();
    },
  },
  Query: {
    async owners(rootObj, args, context) {
      if (!context.user) return [];

      const [organizations, users] = await Promise.all([
        context.user.$relatedQuery("organizations"),
        User.query()
          .distinct("users.id")
          .select("users.*")
          .innerJoin("repositories", "repositories.userId", "users.id")
          .innerJoin(
            "user_repository_rights",
            "user_repository_rights.repositoryId",
            "repositories.id"
          )
          .where("user_repository_rights.userId", context.user.id)
          .whereNot("users.id", context.user.id),
      ]);

      const owners = [...organizations, ...users].sort(sortByLogin);

      return [context.user, ...owners];
    },
    async owner(rootObject, args, context) {
      const owner = await getOwner({ login: args.login });
      if (!owner) return null;
      const ownerRepositories = await getOwnerRepositories(owner, {
        user: context.user,
        enabled: context.user ? undefined : true,
      });
      return ownerRepositories.length === 0 ? null : owner;
    },
  },
};
