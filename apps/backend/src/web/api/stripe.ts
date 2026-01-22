import { invariant } from "@argos/util/invariant";
import * as Sentry from "@sentry/node";
import express from "express";

import config from "@/config";
import { getAdminAccount } from "@/graphql/services/account";
import parentLogger from "@/logger";
import {
  createStripeCheckoutSession,
  getStripeProPlanOrThrow,
  handleStripeEvent,
  stripe,
} from "@/stripe";
import type { Stripe } from "@/stripe";
import { boom } from "@/util/error";

import { auth } from "../middlewares/auth";
import { allowApp } from "../middlewares/cors";
import { allowOnlyPost } from "../middlewares/methods";
import { asyncHandler } from "../util";

const logger = parentLogger.child({ module: "stripe" });

const router: express.Router = express.Router();

async function parseStripeEvent(req: express.Request) {
  try {
    const signature = req.headers["stripe-signature"];
    invariant(signature, "Stripe webhook signature missing");
    const event: Stripe.Event = stripe.webhooks.constructEvent(
      req.body,
      signature,
      config.get("stripe.webhookSecret"),
    );
    return event;
  } catch {
    throw boom(400, "Stripe webhook signature verification failed");
  }
}

router.post(
  "/stripe/event-handler",
  express.raw({ type: "application/json" }),
  asyncHandler(async (req, res) => {
    const event = await parseStripeEvent(req);
    try {
      await handleStripeEvent(event);
    } catch (error) {
      Sentry.setContext(
        "stripeEvent",
        event as unknown as Record<string, unknown>,
      );

      throw boom(500, "An error occurred while handling Stripe event.", {
        cause: error,
      });
    }
    res.sendStatus(200);
  }),
);

router.use(
  "/stripe/create-customer-portal-session",
  allowApp,
  allowOnlyPost,
  auth,
  express.json(),
  asyncHandler(async (req, res) => {
    try {
      const { stripeCustomerId, accountId } = req.body;
      const user = req.auth?.user;

      invariant(user, "user not logged in");
      invariant(stripeCustomerId, "Stripe customer id missing");
      invariant(accountId, "account id missing");

      const account = await getAdminAccount({
        id: accountId,
        user,
      });

      invariant(
        account.stripeCustomerId === stripeCustomerId,
        "Stripe customer id mismatch",
      );

      const session = await stripe.billingPortal.sessions.create({
        customer: stripeCustomerId,
        return_url: new URL(
          `/${account.slug}/settings`,
          config.get("server.url"),
        ).href,
      });
      invariant(session.url, "no session url");

      res.json({ sessionUrl: session.url });
    } catch (error) {
      logger.error(
        { error },
        "An error occurred while creating Stripe portal session.",
      );
      res.redirect(302, "/error");
    }
  }),
);

router.use(
  "/stripe/create-checkout-session",
  allowApp,
  allowOnlyPost,
  auth,
  express.json(),
  asyncHandler(async (req, res) => {
    try {
      const { accountId, successUrl, cancelUrl } = req.body;
      invariant(req.auth, "Unauthenticated");
      invariant(accountId, "accountId missing");

      const [teamAccount, proPlan, noTrial] = await Promise.all([
        getAdminAccount({ id: accountId, user: req.auth.user }),
        getStripeProPlanOrThrow(),
        req.auth.account.$checkHasSubscribedToTrial(),
      ]);

      const session = await createStripeCheckoutSession({
        plan: proPlan,
        teamAccount,
        subscriberAccount: req.auth.account,
        successUrl,
        cancelUrl,
        trial: !noTrial,
      });

      invariant(session.url, "no session url");

      res.json({ sessionUrl: session.url });
    } catch (error) {
      logger.error(
        { error },
        "An error occurred while creating Stripe checkout session.",
      );
      res.redirect(302, "/error");
    }
  }),
);

export default router;
