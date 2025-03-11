import { assertNever } from "@argos/util/assertNever";
import { invariant } from "@argos/util/invariant";
import { RelationExpression } from "objection";

import {
  Account,
  Subscription,
  Team,
  TeamUser,
  User,
} from "@/database/models/index.js";
import { transaction } from "@/database/transaction.js";
import { uninstallSlackInstallation } from "@/slack/index.js";
import { cancelStripeSubscription } from "@/stripe/index.js";

import { forbidden } from "../util.js";
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
        // Delete all team user relationships
        await TeamUser.query(trx).where("teamId", account.teamId).delete();

        // Delete the team
        await Team.query(trx).where("id", account.teamId).delete();

        break;
      }
      case "user": {
        await Promise.all([
          // Remove user from all of its teams
          TeamUser.query(trx).where("userId", account.userId).delete(),

          // Remove user from all its subscriptions
          Subscription.query(trx)
            .where("subscriberId", account.userId)
            .patch({ subscriberId: null }),
        ]);

        // Delete the user
        await User.query(trx).where("id", account.userId).delete();

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
