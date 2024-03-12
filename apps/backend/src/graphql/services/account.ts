import { assertNever } from "@argos/util/assertNever";
import { invariant } from "@argos/util/invariant";

import {
  Account,
  Subscription,
  Team,
  TeamUser,
  User,
} from "@/database/models/index.js";
import { cancelStripeSubscription } from "@/stripe/index.js";

import { deleteProject } from "./project.js";

export const getAdminAccount = async (args: {
  id: string;
  user: User | undefined | null;
}): Promise<Account> => {
  invariant(args.user, "no user");
  const account = await Account.query().findById(args.id).throwIfNotFound();
  const permissions = await account.$getPermissions(args.user);
  invariant(permissions.includes("admin"), "not admin");
  return account;
};

export const deleteAccount = async (args: {
  id: string;
  user: User | undefined | null;
}) => {
  const account = await getAdminAccount({
    id: args.id,
    user: args.user,
  });
  const projects = await account.$relatedQuery("projects");
  await Promise.all(
    projects.map((project) => {
      return deleteProject({
        id: project.id,
        user: args.user,
      });
    }),
  );
  const manager = account.$getSubscriptionManager();
  const subscription = await manager.getActiveSubscription();
  // Cancel the Stripe subscription if it exists
  if (subscription?.stripeSubscriptionId) {
    await cancelStripeSubscription(subscription.stripeSubscriptionId);
  }
  await Subscription.query().where("accountId", account.id).delete();
  await account.$query().delete();

  switch (account.type) {
    case "team": {
      await TeamUser.query().where("teamId", account.teamId).delete();
      await Team.query().where("id", account.teamId).delete();
      break;
    }
    case "user": {
      await TeamUser.query().where("userId", account.userId).delete();
      await Subscription.query()
        .where("subscriberId", account.userId)
        .patch({ subscriberId: null });
      await User.query().where("id", account.userId).delete();
      break;
    }
    default:
      assertNever(account.type);
  }
};
