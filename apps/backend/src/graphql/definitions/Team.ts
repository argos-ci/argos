import { invariant } from "@argos/util/invariant";
import gqlTag from "graphql-tag";

import config from "@/config/index.js";
import { transaction } from "@/database/index.js";
import {
  Account,
  GithubAccountMember,
  GithubInstallation,
  Team,
  TeamUser,
} from "@/database/models/index.js";
import { createTeamAccount } from "@/database/services/team.js";
import { getAppOctokit, getInstallationOctokit } from "@/github/client.js";
import {
  createArgosSubscriptionFromStripe,
  createStripeCheckoutSession,
  getCustomerIdFromUserAccount,
  getStripePriceFromPlanOrThrow,
  getStripeProPlanOrThrow,
  getSubscriptionData,
  stripe,
} from "@/stripe/index.js";

import type {
  IResolvers,
  ITeamDefaultUserLevel,
  ITeamUserLevel,
} from "../__generated__/resolver-types.js";
import { deleteAccount, getAdminAccount } from "../services/account.js";
import {
  checkUserHasAccessToInstallation,
  getOrCreateGithubAccount,
  importOrgMembers,
} from "../services/github.js";
import { forbidden, unauthenticated } from "../util.js";
import { paginateResult } from "./PageInfo.js";

const { gql } = gqlTag;

export const typeDefs = gql`
  type Team implements Node & Account {
    id: ID!
    stripeCustomerId: String
    stripeClientReferenceId: String!
    consumptionRatio: Float!
    currentPeriodScreenshots: Int!
    additionalScreenshotsCost: Float!
    includedScreenshots: Int!
    slug: String!
    name: String
    periodStartDate: DateTime
    periodEndDate: DateTime
    plan: Plan
    subscription: AccountSubscription
    subscriptionStatus: AccountSubscriptionStatus
    oldPaidSubscription: AccountSubscription
    permissions: [AccountPermission!]!
    projects(after: Int = 0, first: Int = 30): ProjectConnection!
    avatar: AccountAvatar!
    hasForcedPlan: Boolean!
    gitlabAccessToken: String
    gitlabBaseUrl: String
    glNamespaces: GlApiNamespaceConnection
    slackInstallation: SlackInstallation
    githubAccount: GithubAccount
    metrics(input: AccountMetricsInput!): AccountMetrics!
    meteredSpendLimitByPeriod: Int
    blockWhenSpendLimitIsReached: Boolean!

    me: TeamMember
    members(
      after: Int = 0
      first: Int = 30
      search: String
      levels: [TeamUserLevel!]
      sso: Boolean
    ): TeamMemberConnection!
    githubMembers(after: Int = 0, first: Int = 30): TeamGithubMemberConnection
    inviteLink: String
    ssoGithubAccount: GithubAccount
    defaultUserLevel: TeamDefaultUserLevel!
    githubLightInstallation: GithubInstallation
  }

  enum TeamDefaultUserLevel {
    member
    contributor
  }

  enum TeamUserLevel {
    owner
    member
    contributor
  }

  type TeamMemberConnection implements Connection {
    pageInfo: PageInfo!
    edges: [TeamMember!]!
  }

  type TeamMember implements Node {
    id: ID!
    user: User!
    level: TeamUserLevel!
  }

  type TeamGithubMemberConnection implements Connection {
    pageInfo: PageInfo!
    edges: [TeamGithubMember!]!
  }

  type TeamGithubMember implements Node {
    id: ID!
    githubAccount: GithubAccount!
    teamMember: TeamMember
  }

  type RemoveUserFromTeamPayload {
    teamMemberId: ID!
  }

  input CreateTeamInput {
    name: String!
  }

  input LeaveTeamInput {
    teamAccountId: ID!
  }

  input RemoveUserFromTeamInput {
    teamAccountId: ID!
    userAccountId: ID!
  }

  input SetTeamMemberLevelInput {
    teamAccountId: ID!
    userAccountId: ID!
    level: TeamUserLevel!
  }

  input DeleteTeamInput {
    accountId: ID!
  }

  type CreateTeamResult {
    team: Team!
    redirectUrl: String!
  }

  input EnableGitHubSSOOnTeamInput {
    teamAccountId: ID!
    ghInstallationId: Int!
  }

  input DisableGitHubSSOOnTeamInput {
    teamAccountId: ID!
  }

  input SetTeamDefaultUserLevelInput {
    teamAccountId: ID!
    level: TeamDefaultUserLevel!
  }

  extend type Query {
    invitation(token: String!): Team
  }

  extend type Mutation {
    "Create a team"
    createTeam(input: CreateTeamInput!): CreateTeamResult!
    "Leave a team"
    leaveTeam(input: LeaveTeamInput!): Boolean!
    "Remove a user from a team"
    removeUserFromTeam(
      input: RemoveUserFromTeamInput!
    ): RemoveUserFromTeamPayload!
    "Accept an invitation to join a team"
    acceptInvitation(token: String!): Team!
    "Set member level"
    setTeamMemberLevel(input: SetTeamMemberLevelInput!): TeamMember!
    "Delete team and all its projects"
    deleteTeam(input: DeleteTeamInput!): Boolean!
    "Enable GitHub SSO"
    enableGitHubSSOOnTeam(input: EnableGitHubSSOOnTeamInput!): Team!
    "Disable GitHub SSO"
    disableGitHubSSOOnTeam(input: DisableGitHubSSOOnTeamInput!): Team!
    "Set team default user level"
    setTeamDefaultUserLevel(input: SetTeamDefaultUserLevelInput!): Team!
  }
`;

export const resolvers: IResolvers = {
  TeamGithubMember: {
    githubAccount: async (githubAccountMember, _args, ctx) => {
      const githubAccount = await ctx.loaders.GithubAccount.load(
        githubAccountMember.githubMemberId,
      );
      invariant(githubAccount, "GitHub account not found");
      return githubAccount;
    },
    teamMember: async (githubAccountMember, _args, ctx) => {
      return ctx.loaders.TeamUserFromGithubMember.load(githubAccountMember);
    },
  },
  TeamMember: {
    user: async (teamUser, _args, ctx) => {
      const account = await ctx.loaders.AccountFromRelation.load({
        userId: teamUser.userId,
      });
      invariant(account, "account not found");
      return account;
    },
    level: (teamUser) => teamUser.userLevel as ITeamUserLevel,
  },
  Team: {
    me: async (account, _args, ctx) => {
      invariant(account.teamId, "not a team account");

      if (!ctx.auth) {
        throw unauthenticated();
      }

      const teamUser = await TeamUser.query()
        .where("teamId", account.teamId)
        .where("userId", ctx.auth.user.id)
        .first();

      if (!teamUser) {
        invariant(
          ctx.auth.user.staff,
          "user is not staff and teamUser is undefined",
        );
        return null;
      }

      return teamUser;
    },
    members: async (account, args, ctx) => {
      invariant(account.teamId, "not a team account");

      if (!ctx.auth) {
        throw unauthenticated();
      }

      const { first, after, levels, search } = args;

      const team = await ctx.loaders.Team.load(account.teamId);

      invariant(team, "team not found");

      const hasGithubSSO = Boolean(team.ssoGithubAccountId);

      const query = TeamUser.query()
        .where("team_users.teamId", account.teamId)
        .orderByRaw(
          `(CASE WHEN team_users."userId" = ? THEN 0
     ELSE team_users."id"
     END) ASC
    `,
          ctx.auth.user.id,
        )
        .range(after, after + first - 1);

      if (levels && levels.length > 0) {
        query.whereIn("team_users.userLevel", levels);
      }

      if (search) {
        query.withGraphJoined("user.account").where((qb) => {
          qb.where("user:account.name", "ilike", `%${search}%`)
            .orWhere("user:account.slug", "ilike", `%${search}%`)
            .orWhere("user.email", "ilike", `%${search}%`);
        });
      }

      // If SSO is activated, exclude SSO members.
      if (hasGithubSSO && typeof args.sso === "boolean") {
        if (args.sso) {
          query
            .withGraphJoined("user.account")
            .whereIn(
              "user:account.githubAccountId",
              GithubAccountMember.query()
                .select("githubMemberId")
                .where("githubAccountId", team.ssoGithubAccountId),
            );
        } else {
          query
            .withGraphJoined("user.account")
            .whereNotIn(
              "user:account.githubAccountId",
              GithubAccountMember.query()
                .select("githubMemberId")
                .where("githubAccountId", team.ssoGithubAccountId),
            );
        }
      }

      const result = await query;

      return paginateResult({ result, first, after });
    },
    githubMembers: async (account, args, ctx) => {
      if (!ctx.auth) {
        throw unauthenticated();
      }

      const { first, after } = args;

      invariant(account.teamId);

      const team = await ctx.loaders.Team.load(account.teamId);
      invariant(team);

      if (!team.ssoGithubAccountId) {
        return null;
      }

      const result = await GithubAccountMember.query()
        .withGraphJoined("githubMember")
        .where("githubAccountId", team.ssoGithubAccountId)
        .orderBy("githubMember.login", "asc")
        .range(after, after + first - 1);

      return paginateResult({ result, first, after });
    },
    inviteLink: async (account, _args, ctx) => {
      if (!ctx.auth) {
        throw unauthenticated();
      }

      invariant(account.teamId);
      const [team, permissions] = await Promise.all([
        ctx.loaders.Team.load(account.teamId),
        Team.getPermissions(account.teamId, ctx.auth.user),
      ]);

      if (!permissions.includes("admin")) {
        return null;
      }

      invariant(team);
      const inviteLink = await team.$getInviteLink();
      return inviteLink;
    },
    ssoGithubAccount: async (account, _args, ctx) => {
      if (!ctx.auth) {
        throw unauthenticated();
      }
      invariant(account.teamId);
      const team = await ctx.loaders.Team.load(account.teamId);
      invariant(team);

      if (!team.ssoGithubAccountId) {
        return null;
      }

      return ctx.loaders.GithubAccount.load(team.ssoGithubAccountId);
    },
    defaultUserLevel: async (account, _args, ctx) => {
      if (!ctx.auth) {
        throw unauthenticated();
      }
      invariant(account.teamId);
      const team = await ctx.loaders.Team.load(account.teamId);
      invariant(team);

      return team.defaultUserLevel as ITeamDefaultUserLevel;
    },
    githubLightInstallation: async (account, _args, ctx) => {
      if (!ctx.auth) {
        throw unauthenticated();
      }

      if (!account.githubLightInstallationId) {
        return null;
      }

      const installation = await ctx.loaders.GithubInstallation.load(
        account.githubLightInstallationId,
      );
      invariant(installation);
      if (installation.deleted) {
        return null;
      }
      return installation;
    },
  },
  Query: {
    invitation: async (_root, { token }) => {
      const team = await Team.verifyInviteToken(token, {
        withGraphFetched: "account",
      });
      invariant(team, "Invalid token");
      invariant(team.account, "Team account not loaded");
      return team.account;
    },
  },
  Mutation: {
    createTeam: async (_root, args, ctx) => {
      const { auth } = ctx;

      if (!auth) {
        throw unauthenticated();
      }

      const teamAccount = await createTeamAccount({
        name: args.input.name,
        ownerId: auth.user.id,
      });

      const [hasSubscribedToTrial, plan] = await Promise.all([
        auth.account.$checkHasSubscribedToTrial(),
        getStripeProPlanOrThrow(),
      ]);

      const teamUrl = new URL(`/${teamAccount.slug}`, config.get("server.url"))
        .href;

      const redirectToStripe = async ({ trial }: { trial: boolean }) => {
        const session = await createStripeCheckoutSession({
          teamAccount,
          plan,
          subscriberAccount: auth.account,
          trial,
          successUrl: teamUrl,
          cancelUrl: `${teamUrl}?checkout=cancel`,
        });

        invariant(session.url, "session.url missing");

        return { team: teamAccount, redirectUrl: session.url };
      };

      // If the user has already subscribed to a trial, we will redirect to the checkout page
      if (hasSubscribedToTrial) {
        return redirectToStripe({ trial: false });
      }

      // Else we will try to setup trial server-side

      // Try to get or create a Stripe customer for the user
      const stripeCustomerId = await getCustomerIdFromUserAccount(auth.account);

      // If we failed to create a customer (no email), we will redirect to checkout page
      if (!stripeCustomerId) {
        return redirectToStripe({ trial: true });
      }

      // Register the Stripe customer id to the team account
      await teamAccount.$query().patchAndFetch({ stripeCustomerId });

      const price = await getStripePriceFromPlanOrThrow(plan);

      // Create a Stripe subscription for the user
      const stripeSubscription = await stripe.subscriptions.create({
        customer: stripeCustomerId,
        items: [{ price: price.id }],
        ...getSubscriptionData({
          trial: true,
          accountId: teamAccount.id,
          subscriberId: auth.user.id,
        }),
      });

      await createArgosSubscriptionFromStripe({
        stripeSubscription,
        account: teamAccount,
        subscriberId: auth.user.id,
      });

      return {
        team: teamAccount,
        redirectUrl: teamUrl,
      };
    },
    leaveTeam: async (_root, args, ctx) => {
      if (!ctx.auth) {
        throw unauthenticated();
      }

      const account = await Account.query()
        .findById(args.input.teamAccountId)
        .throwIfNotFound();

      const count = await TeamUser.query()
        .where({ teamId: account.teamId })
        .resultSize();

      if (count === 1) {
        throw forbidden(
          "You are the last user of this team, you can't leave it",
        );
      }

      await transaction(async (trx) => {
        if (!ctx.auth) {
          throw unauthenticated();
        }

        await TeamUser.query(trx).delete().where({
          userId: ctx.auth.user.id,
          teamId: account.teamId,
        });

        // The last one is the only one, so it must be the owner
        if (count === 2) {
          await TeamUser.query(trx)
            .where({ teamId: account.teamId })
            .patch({ userLevel: "owner" });
        }
      });

      return true;
    },
    removeUserFromTeam: async (_root, args, ctx) => {
      if (!ctx.auth) {
        throw unauthenticated();
      }
      const [teamAccount, userAccount] = await Promise.all([
        getAdminAccount({
          id: args.input.teamAccountId,
          user: ctx.auth.user,
        }),
        Account.query().findById(args.input.userAccountId).throwIfNotFound(),
      ]);

      const count = await TeamUser.query()
        .where({ teamId: teamAccount.teamId })
        .resultSize();

      if (count === 1) {
        throw forbidden("Can't remove the last user of a team.");
      }

      const teamUser = await TeamUser.query()
        .select("id")
        .findOne({
          teamId: teamAccount.teamId,
          userId: userAccount.userId,
        })
        .throwIfNotFound();

      await transaction(async (trx) => {
        if (!ctx.auth) {
          throw unauthenticated();
        }

        const teamUser = await TeamUser.query(trx)
          .select("id")
          .findOne({
            teamId: teamAccount.teamId,
            userId: userAccount.userId,
          })
          .throwIfNotFound();

        await teamUser.$query(trx).delete();

        // The last one is the only one, so it must be the owner
        if (count === 2) {
          await TeamUser.query(trx)
            .where({ teamId: teamAccount.teamId })
            .patch({ userLevel: "owner" });
        }
      });

      return {
        teamMemberId: teamUser.id,
      };
    },
    acceptInvitation: async (_root, args, ctx): Promise<Account> => {
      if (!ctx.auth) {
        throw unauthenticated();
      }
      const team = await Team.verifyInviteToken(args.token, {
        withGraphFetched: "account",
      });
      invariant(team, "Invalid token");
      invariant(team.account, "Team account not loaded");

      const teamUser = await TeamUser.query().findOne({
        teamId: team.id,
        userId: ctx.auth.user.id,
      });

      if (teamUser) {
        return team.account;
      }

      await TeamUser.query().insert({
        userId: ctx.auth.user.id,
        teamId: team.id,
        userLevel: team.defaultUserLevel,
      });

      return team.account;
    },
    setTeamMemberLevel: async (_root, args, ctx) => {
      if (!ctx.auth) {
        throw unauthenticated();
      }
      const [teamAccount, userAccount] = await Promise.all([
        getAdminAccount({
          id: args.input.teamAccountId,
          user: ctx.auth.user,
        }),
        Account.query().findById(args.input.userAccountId).throwIfNotFound(),
      ]);

      const teamUser = await TeamUser.query()
        .findOne({
          userId: userAccount.userId,
          teamId: teamAccount.teamId,
        })
        .throwIfNotFound();

      if (teamUser.userLevel === args.input.level) {
        return teamUser;
      }

      return teamUser.$query().patchAndFetch({
        userLevel: args.input.level,
      });
    },
    deleteTeam: async (_root, args, ctx) => {
      await deleteAccount({ id: args.input.accountId, user: ctx.auth?.user });
      return true;
    },
    enableGitHubSSOOnTeam: async (_root, args, ctx) => {
      if (!ctx.auth) {
        throw unauthenticated();
      }

      const [installation, hasAccessToInstallation, teamAccount] =
        await Promise.all([
          GithubInstallation.query()
            .findOne("githubId", args.input.ghInstallationId)
            .where("deleted", false)
            .throwIfNotFound(),
          checkUserHasAccessToInstallation(
            ctx.auth.account,
            args.input.ghInstallationId,
          ),
          getAdminAccount({
            id: args.input.teamAccountId,
            user: ctx.auth.user,
            withGraphFetched: "githubLightInstallation",
          }),
        ]);

      if (!hasAccessToInstallation) {
        throw forbidden("User does not have access to GitHub installation");
      }

      const app =
        teamAccount.githubLightInstallation &&
        !teamAccount.githubLightInstallation.deleted
          ? "light"
          : "main";

      const appOctokit = getAppOctokit({ app });

      const ghInstallation = await appOctokit.apps.getInstallation({
        installation_id: installation.githubId,
      });
      const ghOrg = ghInstallation.data.account;
      invariant(ghOrg, "GitHub Organization not found");
      invariant("type" in ghOrg, "GitHub enterprise not supported");

      const githubAccount = await getOrCreateGithubAccount(ghOrg);
      invariant(githubAccount, "GitHub account not found");

      const octokit = await getInstallationOctokit(installation.id, appOctokit);
      invariant(octokit, "Invalid installation");

      const { teamId } = teamAccount;
      invariant(teamId, "Account teamId is undefined");

      const newTeamUserInputs = await importOrgMembers({
        octokit,
        org: ghOrg.login,
        teamId,
        githubAccount,
      });

      const manager = teamAccount.$getSubscriptionManager();
      const [plan, subscriptionStatus, subscription] = await Promise.all([
        manager.getPlan(),
        manager.getSubscriptionStatus(),
        manager.getActiveSubscription(),
      ]);

      if (subscriptionStatus !== "active") {
        throw forbidden("A valid subscription is required to enable SSO");
      }

      const priced = !plan?.githubSsoIncluded;

      if (priced) {
        if (!subscription) {
          throw forbidden("A valid subscription is required to enable SSO");
        }

        if (!subscription.stripeSubscriptionId) {
          throw forbidden("GitHub SSO is not available on your current plan");
        }

        const [stripeSubscription, stripeProduct] = await Promise.all([
          stripe.subscriptions.retrieve(subscription.stripeSubscriptionId),
          stripe.products.retrieve(config.get("githubSso.stripeProductId")),
        ]);

        invariant(
          stripeSubscription,
          `Subscription ${subscription.stripeSubscriptionId} not found`,
        );
        invariant(
          stripeProduct,
          `Product ${config.get("githubSso.stripeProductId")} not found`,
        );
        invariant(
          typeof stripeProduct.default_price === "string",
          "Product default_price is undefined",
        );

        const alreadyBought = stripeSubscription.items.data.some(
          (item) => item.price.product === stripeProduct.id,
        );

        // If the user has not already bought the SSO product, we will add it to the subscription
        if (!alreadyBought) {
          await stripe.subscriptionItems.create({
            subscription: subscription.stripeSubscriptionId,
            price: stripeProduct.default_price,
          });
        }
      }

      // Enable SSO and add members in a transaction
      await transaction(async (trx) => {
        await Promise.all([
          Team.query(trx).findById(teamId).patch({
            ssoGithubAccountId: githubAccount.id,
          }),
          newTeamUserInputs.length > 0
            ? TeamUser.query(trx).insert(newTeamUserInputs)
            : null,
        ]);
      });

      return teamAccount;
    },
    disableGitHubSSOOnTeam: async (_root, args, ctx) => {
      if (!ctx.auth) {
        throw unauthenticated();
      }

      const teamAccount = await getAdminAccount({
        id: args.input.teamAccountId,
        user: ctx.auth.user,
      });

      invariant(teamAccount.teamId, "Account teamId is undefined");

      const manager = teamAccount.$getSubscriptionManager();
      const subscription = await manager.getActiveSubscription();

      if (subscription?.stripeSubscriptionId) {
        const [stripeSubscription, stripeProduct] = await Promise.all([
          stripe.subscriptions.retrieve(subscription.stripeSubscriptionId),
          stripe.products.retrieve(config.get("githubSso.stripeProductId")),
        ]);

        invariant(
          stripeSubscription,
          `Subscription ${subscription.stripeSubscriptionId} not found`,
        );

        invariant(
          stripeProduct,
          `Product ${config.get("githubSso.stripeProductId")} not found`,
        );

        const item = stripeSubscription.items.data.find(
          (item) => item.price.product === stripeProduct.id,
        );

        // If the user has bought the SSO product, we will remove it from the subscription
        if (item) {
          await stripe.subscriptionItems.del(item.id);
        }
      }

      await Team.query().findById(teamAccount.teamId).patch({
        ssoGithubAccountId: null,
      });

      return teamAccount;
    },
    setTeamDefaultUserLevel: async (_root, args, ctx) => {
      if (!ctx.auth) {
        throw unauthenticated();
      }

      const teamAccount = await getAdminAccount({
        id: args.input.teamAccountId,
        user: ctx.auth.user,
      });

      invariant(teamAccount.teamId, "Account teamId is undefined");

      await Team.query().findById(teamAccount.teamId).patch({
        defaultUserLevel: args.input.level,
      });

      return teamAccount;
    },
  },
};
