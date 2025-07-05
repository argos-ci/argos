import { assertNever } from "@argos/util/assertNever";
import { invariant } from "@argos/util/invariant";
import { RelationExpression } from "objection";

import {
  Account,
  BuildReview,
  Subscription,
  Team,
  TeamUser,
  User,
} from "@/database/models/index.js";
import { transaction } from "@/database/transaction.js";
import { uninstallSlackInstallation } from "@/slack/index.js";
import { cancelStripeSubscription } from "@/stripe/index.js";

import { badUserInput, forbidden } from "../util.js";
import { unsafe_deleteProject } from "./project.js";

/**
 * Get an account by ID, ensuring the user has admin permissions.
 */
export async function getAdminAccount(args: {
  id: string;
  user: User | undefined | null;
  withGraphFetched?: RelationExpression<Account>;
}): Promise<Account> {
  invariant(args.user, "no user");
  const query = Account.query().findById(args.id).throwIfNotFound();
  if (args.withGraphFetched) {
    query.withGraphFetched(args.withGraphFetched);
  }
  const account = await query;
  const permissions = await account.$getPermissions(args.user);
  if (!permissions.includes("admin")) {
    throw forbidden("user is not an admin of the account");
  }
  return account;
}

/**
 * Delete an account and all associated projects and subscriptions.
 */
export async function deleteAccount(args: {
  id: string;
  user: User | undefined | null;
}): Promise<void> {
  const account = await getAdminAccount({
    id: args.id,
    user: args.user,
    withGraphFetched: "[projects,slackInstallation]",
  });
  const projects = account.projects;
  invariant(projects, "projects not fetched");

  const manager = account.$getSubscriptionManager();
  const subscription = await manager.getActiveSubscription();

  const { stripeSubscriptionId } = await transaction(async (trx) => {
    await Promise.all([
      // Remove all projects
      ...projects.map(async (project) => {
        await unsafe_deleteProject({ projectId: project.id, trx });
      }),

      // Uninstall slack installation if it exists
      account.slackInstallation
        ? uninstallSlackInstallation(account.slackInstallation, trx)
        : null,

      // Remove all subscriptions linkedto the account
      Subscription.query(trx).where("accountId", account.id).delete(),
    ]);

    // Delete the account
    await account.$query(trx).delete();

    // Delete the account's associated user or team
    switch (account.type) {
      case "team": {
        const { teamId } = account;
        invariant(teamId, "account.teamId is undefined");

        // Delete all team user relationships
        await TeamUser.query(trx).where("teamId", teamId).delete();

        // Delete the team
        await Team.query(trx).where("id", teamId).delete();

        break;
      }
      case "user": {
        const { userId } = account;
        invariant(userId, "account.userId is undefined");

        const teams = await Team.query(trx)
          .whereIn(
            "id",
            TeamUser.query(trx).select("teamId").where("userId", userId),
          )
          .withGraphFetched("[owners,account]");

        for (const team of teams) {
          invariant(team.owners, "team.owners is undefined");
          invariant(team.account, "team.account is undefined");
          const singleOwner = team.owners.length === 1 ? team.owners[0] : null;
          if (singleOwner && singleOwner.id === userId) {
            throw badUserInput(
              `Cannot delete your account because you are the only owner of team ${team.account.name}. Please transfer ownership to another user or remove your team first.`,
            );
          }
        }

        await Promise.all([
          // Remove user from all of its teams
          TeamUser.query(trx).where("userId", userId).delete(),

          // Remove user from all its subscriptions
          Subscription.query(trx)
            .where("subscriberId", userId)
            .patch({ subscriberId: null }),

          // Remove user from all its build reviews
          BuildReview.query(trx)
            .where("userId", userId)
            .patch({ userId: null }),
        ]);

        // Erase the user informations
        await User.query(trx).patch({
          deletedAt: new Date().toISOString(),
          gitlabUserId: null,
          googleUserId: null,
          email: null,
        });

        break;
      }
      default:
        assertNever(account.type);
    }

    return { stripeSubscriptionId: subscription?.stripeSubscriptionId ?? null };
  });

  // Cancel the stripe subscription if it exists
  if (stripeSubscriptionId) {
    await cancelStripeSubscription(stripeSubscriptionId);
  }
}
