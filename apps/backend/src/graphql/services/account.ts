import {
  Account,
  Subscription,
  Team,
  TeamUser,
  User,
} from "@/database/models/index.js";

import { deleteProject } from "./project.js";
import { cancelStripeSubscription } from "@/stripe/index.js";

export const getWritableAccount = async (args: {
  id: string;
  user: User | undefined | null;
}): Promise<Account> => {
  if (!args.user) {
    throw new Error("Unauthorized");
  }
  const account = await Account.query().findById(args.id).throwIfNotFound();
  const hasWritePermission = await account.$checkWritePermission(args.user);
  if (!hasWritePermission) {
    throw new Error("Unauthorized");
  }
  return account;
};

export const deleteAccount = async (args: {
  id: string;
  user: User | undefined | null;
}) => {
  const account = await getWritableAccount({
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
      throw new Error(`Unknown account type: ${account.type}`);
  }
};
