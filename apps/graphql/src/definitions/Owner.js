import { gql } from "graphql-tag";
import moment from "moment";
import {
  User,
  Organization,
  Purchase,
  Screenshot,
} from "@argos-ci/database/models";

export const typeDefs = gql`
  enum OwnerType {
    organization
    user
  }

  type Owner {
    id: ID!
    name: String
    login: String!
    type: OwnerType!
    repositoriesNumber: Int!
    repositories(enabled: Boolean): [Repository!]!
    permissions: [Permission]!
    purchases: [Purchase!]!
    currentMonthUsedScreenshots: Int!
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

function getOwnerRepositories(owner, { user, enabled } = {}) {
  if (!user) {
    const repositoriesQuery = owner.$relatedQuery("repositories").where({
      private: false,
      [`repositories.${owner.type()}Id`]: owner.id,
    });

    if (enabled !== undefined) {
      return repositoriesQuery.where({ enabled });
    }

    return repositoriesQuery;
  }

  const repositoriesQuery = owner
    .$relatedQuery("repositories")
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
    );

  if (enabled !== undefined) {
    return repositoriesQuery.where({ enabled });
  }

  return repositoriesQuery;
}

async function getActivePurchases(owner) {
  return Purchase.query()
    .joinRelated(owner.type())
    .where(`${owner.type()}.id`, owner.id)
    .where((query) =>
      query.whereNull("endDate").orWhere("endDate", ">=", moment())
    )
    .orderBy("endDate");
}

export const resolvers = {
  Owner: {
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
    async repositoriesNumber(owner, args, context) {
      const [{ count }] = await getOwnerRepositories(owner, {
        user: context.user,
        enabled: args.enabled,
      }).count("repositories.*");
      return count;
    },
    async purchases(owner) {
      return getActivePurchases(owner);
    },
    async currentMonthUsedScreenshots(owner) {
      return Screenshot.query()
        .joinRelated("screenshotBucket.repository")
        .where({ [`screenshotBucket:repository.${owner.type()}Id`]: owner.id })
        .where(
          "screenshots.createdAt",
          ">=",
          moment().startOf("month").toISOString()
        )
        .resultSize();
    },
  },
  Query: {
    async owners(rootObj, args, context) {
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
    async owner(rootObject, args) {
      return getOwner({ login: args.login });
    },
  },
};
