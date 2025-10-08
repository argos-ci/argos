import { invariant } from "@argos/util/invariant";
import type Stripe from "stripe";

import config from "@/config";
import { Plan, Subscription, User } from "@/database/models";
import { sendEmailTemplate } from "@/email/send-email-template";
import {
  getDefaultTeamPlanItems,
  getStripeProPlanOrThrow,
  stripe,
} from "@/stripe";
import { sanitizeEmail } from "@/util/email";

const END_SUBSCRIPTION_AFTER = new Date("2025-12-01T00:00:00.000Z");

/**
 * Returns the first period end strictly after the given threshold.
 * Returns both a Date and the Unix seconds you can pass to Stripe.
 */
function computeFirstPeriodEndAfter(subscription: Stripe.Subscription): {
  date: Date;
  unixSeconds: number;
} {
  const item = subscription.items.data[0];
  if (!item?.price?.recurring) {
    throw new Error("Subscription has no recurring price on the first item");
  }

  // Start from the current known end
  let cursor = new Date(subscription.current_period_end * 1000);

  // If the subscription is in trial, the current_period_end is the end of the trial
  // which is fine because the next step moves into the first paid period
  while (cursor <= END_SUBSCRIPTION_AFTER) {
    cursor = addMonthsClampedUTC(cursor, 1);
  }

  const unixSeconds = Math.floor(cursor.getTime() / 1000);
  return { date: cursor, unixSeconds };
}

/**
 * Simulate the behavior of adding months in Stripe, which is to clamp the day to the
 * last day of the month if the original day does not exist in the target month.
 *
 * For example, adding 1 month to January 31 results in February 28 (or 29 in leap years).
 */
function addMonthsClampedUTC(d: Date, count: number): Date {
  const year = d.getUTCFullYear();
  const month = d.getUTCMonth();
  const day = d.getUTCDate();
  const h = d.getUTCHours();
  const m = d.getUTCMinutes();
  const s = d.getUTCSeconds();
  const ms = d.getUTCMilliseconds();

  const total = month + count;
  const targetYear = year + Math.floor(total / 12);
  const targetMonth = ((total % 12) + 12) % 12;

  const dim = daysInMonthUTC(targetYear, targetMonth);
  const targetDay = Math.min(day, dim);

  return new Date(Date.UTC(targetYear, targetMonth, targetDay, h, m, s, ms));
}

function daysInMonthUTC(year: number, monthZeroBased: number): number {
  // day 0 of next month gives the last day of target month
  return new Date(Date.UTC(year, monthZeroBased + 1, 0)).getUTCDate();
}

console.log(`Running migration script with env: ${config.get("env")}`);

console.log(
  `GitHub SSO product ID: ${config.get("stripe.githubSSOProductId")}`,
);
console.log(
  `Storybook screenshot product ID: ${config.get("stripe.storybookScreenshotProductId")}`,
);
console.log(
  `Screenshot product ID: ${config.get("stripe.screenshotProductId")}`,
);

const [legacyProPlan, newProPlan, githubSSOProduct] = await Promise.all([
  Plan.query()
    .findOne({
      name: "pro",
      usageBased: true,
      // We have a legacy Pro plan that includes 15K
      includedScreenshots: 15000,
    })
    .throwIfNotFound(),
  getStripeProPlanOrThrow(),
  stripe.products.retrieve(config.get("stripe.githubSSOProductId")),
  // Be sure the products exists
  stripe.products.retrieve(config.get("stripe.storybookScreenshotProductId")),
  stripe.products.retrieve(config.get("stripe.screenshotProductId")),
]);

const githubSSODefaultPrice = githubSSOProduct.default_price;

if (typeof githubSSODefaultPrice !== "string") {
  throw new Error("GitHub SSO product has no default price");
}

const subscriptions = await Subscription.query()
  .where("planId", legacyProPlan.id)
  .where("status", "active")
  .withGraphFetched("account");

for (const subscription of subscriptions) {
  console.log("-----");
  console.log(`Migrating subscription ${subscription.id}`);

  const { stripeSubscriptionId: stripeSubId, account } = subscription;
  invariant(account, "Subscription has no account");
  invariant(stripeSubId, "Subscription has no stripeSubscriptionId");

  console.log(`Retrieve stripe subscription ${stripeSubId}`);
  const stripeSubscription = await stripe.subscriptions.retrieve(stripeSubId, {
    expand: ["schedule", "customer"],
  });

  invariant(
    typeof stripeSubscription.customer !== "string",
    "Customer is not expanded",
  );
  invariant(
    stripeSubscription.customer.deleted !== true,
    "Customer is deleted",
  );

  if (stripeSubscription.customer.currency === "eur") {
    console.log(
      `WARNING: Skipping subscription ${subscription.id} because it is in EUR`,
    );
    await new Promise((resolve) => setTimeout(resolve, 1000));
    continue;
  }

  if (stripeSubscription.cancel_at) {
    console.log(
      `Skipping subscription ${subscription.id} because it is scheduled to be canceled at ${new Date(
        stripeSubscription.cancel_at * 1000,
      ).toISOString()}`,
    );
    continue;
  }

  const date = computeFirstPeriodEndAfter(stripeSubscription);
  console.log(`Scheduled migration date: ${date.date.toISOString()}`);

  const { schedule: existingSchedule } = stripeSubscription;

  invariant(typeof existingSchedule !== "string", "Schedule is not expanded");

  if (existingSchedule) {
    if (existingSchedule.phases.length > 1) {
      const secondPhase = existingSchedule.phases[1];
      invariant(secondPhase, "No second phase on existing schedule");
      console.log(
        "Schedule already has a second phase, assuming it has been migrated",
      );
      await new Promise((resolve) => setTimeout(resolve, 1000));
      continue;
      // if (secondPhase.start_date === date.unixSeconds) {
      //   console.log(
      //     `Skipping subscription ${subscription.id} because it has already been migrated to the correct date`,
      //   );
      //   continue;
      // }
      // console.log(
      //   `Existing schedule is not planned to end at the correct date: ${new Date(secondPhase.start_date * 1000).toISOString()} (actual) vs ${date.date.toISOString()} (expected)`,
      // );
    }
  }

  // At this point, the schedule can have been created but not migrated, or not created at all
  const schedule = await (async () => {
    if (existingSchedule) {
      console.log(`Using existing schedule ${existingSchedule.id}`);
      return existingSchedule;
    }
    console.log(`Creating schedule for subscription ${stripeSubId}`);
    return stripe.subscriptionSchedules.create({
      from_subscription: stripeSubId,
    });
  })();

  const firstSubscriptionPhase = schedule.phases[0];

  invariant(firstSubscriptionPhase, "Schedule has no phases");

  console.log(`Updating schedule ${schedule.id}`);
  const defaultNewPlanItems = await getDefaultTeamPlanItems(newProPlan);
  const hasSSOItem = firstSubscriptionPhase.items.some(
    (item) => item.price === githubSSODefaultPrice,
  );
  console.log(`GitHub SSO product detected: ${hasSSOItem ? "yes" : "no"}`);
  await stripe.subscriptionSchedules.update(schedule.id, {
    phases: [
      {
        start_date: firstSubscriptionPhase.start_date,
        end_date: date.unixSeconds,
        items: firstSubscriptionPhase.items.map((item) => {
          if (typeof item.price !== "string") {
            throw new Error("Price is not a string");
          }
          return {
            price: item.price,
          };
        }),
      },
      {
        start_date: date.unixSeconds,
        proration_behavior: "none",
        // Use the same interval as before
        items: [
          ...defaultNewPlanItems,
          hasSSOItem ? { price: githubSSODefaultPrice } : null,
        ].filter((x) => x !== null),
      },
    ],
  });
  console.log(`Migration effective for ${subscription.id}`);

  const ownerIds = await account.$getOwnerIds();
  if (!ownerIds.length) {
    console.warn(
      `WARNING: Account ${account.id} has no owners, no email can be sent`,
    );
    continue;
  }
  const owners = await User.query().whereIn("id", ownerIds);
  const ownerEmails = owners
    .map((owner) => owner.email)
    .filter((x) => x !== null);

  console.log(
    `Owner emails: ${ownerEmails.length > 0 ? ownerEmails.join(", ") : "none"}`,
  );

  const stripeEmail = stripeSubscription.customer.email;

  console.log(`Stripe email: ${stripeEmail ?? "none"}`);

  const allEmails = Array.from(
    new Set(
      [...ownerEmails, ...(stripeEmail ? [stripeEmail] : [])].map(
        sanitizeEmail,
      ),
    ),
  );

  if (allEmails.length === 0) {
    console.warn(
      `WARNING: Account ${account.id} has no owner emails or Stripe email, no email can be sent`,
    );
    continue;
  }

  console.log(`Sending email to ${allEmails.join(", ")}`);
  await sendEmailTemplate({
    template: "new_pricing",
    data: { afterDate: END_SUBSCRIPTION_AFTER },
    to: allEmails,
  });

  console.log(`Migration of subscription ${subscription.id} completed`);

  // Wait a bit to avoid hitting rate limits
  await new Promise((resolve) => setTimeout(resolve, 1000));

  console.log("-----");
}

process.exit(0);
