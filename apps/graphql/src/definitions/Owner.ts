import gqlTag from "graphql-tag";
import type { QueryBuilder } from "objection";

import {
  Account,
  Organization,
  Purchase,
  User,
} from "@argos-ci/database/models";
import type { Repository } from "@argos-ci/database/models";

import type { Context } from "../context.js";

// eslint-disable-next-line import/no-named-as-default-member
const { gql } = gqlTag;

export const typeDefs = gql`
  enum OwnerType {
    organization
    user
  }

  interface Owner implements Node {
    id: ID!
    stripeClientReferenceId: String!
    consumptionRatio: Float
    currentMonthUsedScreenshots: Int!
    login: String!
    name: String!
    permissions: [Permission!]!
    plan: Plan
    purchase: Purchase
    repositories(enabled: Boolean): [Repository!]!
    repositoriesNumber: Int!
    screenshotsLimitPerMonth: Int
    stripeCustomerId: String
    type: OwnerType!
  }

  type Organization implements Node & Owner {
    id: ID!
    stripeClientReferenceId: String!
    consumptionRatio: Float
    currentMonthUsedScreenshots: Int!
    login: String!
    name: String!
    permissions: [Permission!]!
    plan: Plan
    purchase: Purchase
    repositories(enabled: Boolean): [Repository!]!
    repositoriesNumber: Int!
    screenshotsLimitPerMonth: Int
    stripeCustomerId: String
    type: OwnerType!
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
  { user, enabled }: { user: User | null; enabled: boolean | undefined }
) => {
  if (!user) {
    const query = owner
      .$relatedQuery<Repository>("repositories")
      .where({
        private: false,
        forcedPrivate: false,
        [`repositories.${owner.type()}Id`]: owner.id,
      })
      .orderBy("repositories.name", "asc");
    if (enabled !== undefined) {
      return addEnableFilter({ enabled, query });
    }

    return query;
  }

  const query = owner
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
          builder.where({ private: false, forcedPrivate: false }).orWhere({
            "user_repository_rights.userId": user.id,
            [`repositories.${owner.type()}Id`]: owner.id,
          });
        })
    )
    .orderBy("repositories.name", "asc");

  if (enabled !== undefined) {
    return addEnableFilter({ enabled, query });
  }

  return query;
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
    stripeClientReferenceId: async (
      owner: Owner,
      _args: Record<string, never>,
      ctx: Context
    ) => {
      const account = await getOwnerAccount(owner);
      return Purchase.encodeStripeClientReferenceId({
        accountId: account.id,
        purchaserId: ctx.user?.id ?? null,
      });
    },
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
    repositoriesNumber: async (
      owner: Owner,
      _args: Record<string, never>,
      ctx: Context
    ) => {
      const [result] = await getOwnerRepositories(owner, {
        user: ctx.user,
        enabled: undefined,
      }).count("repositories.*");
      return (result as unknown as { count: number }).count;
    },
    permissions: async (
      owner: Owner,
      _args: Record<string, never>,
      ctx: Context
    ) => {
      if (!ctx.user) return ["read"];
      const hasWritePermission = await owner.$checkWritePermission(ctx.user);
      return hasWritePermission ? ["read", "write"] : ["read"];
    },
    consumptionRatio: async (owner: Owner) => {
      const account = await getOwnerAccount(owner);
      return account.getScreenshotsConsumptionRatio();
    },
    currentMonthUsedScreenshots: async (owner: Owner) => {
      const account = await getOwnerAccount(owner);
      return account.getScreenshotsCurrentConsumption();
    },
    purchase: async (owner: Owner) => {
      const account = await getOwnerAccount(owner);
      return account.getActivePurchase();
    },
    stripeCustomerId: async (owner: Owner) => {
      const account = await getOwnerAccount(owner);
      return account ? account.stripeCustomerId : null;
    },
    plan: async (owner: Owner) => {
      const account = await getOwnerAccount(owner);
      return account.getPlan();
    },
    screenshotsLimitPerMonth: async (owner: Owner) => {
      const account = await getOwnerAccount(owner);
      return account.getScreenshotsMonthlyLimit();
    },
    type: () => "organization",
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
    owner: async (_root: null, args: { login: string }) => {
      const owner = await getOwner({ login: args.login });
      return owner;
    },
  },
};
