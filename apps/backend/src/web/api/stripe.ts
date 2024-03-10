import bodyParser from "body-parser";
import express from "express";
import * as Sentry from "@sentry/node";
import config from "@/config/index.js";
import logger from "@/logger/index.js";
import {
  createStripeCheckoutSession,
  getStripeProPlanOrThrow,
  handleStripeEvent,
  stripe,
} from "@/stripe/index.js";
import type { Stripe } from "@/stripe/index.js";

import { auth } from "../middlewares/auth.js";
import { HTTPError, asyncHandler } from "../util.js";
import { getAdminAccount } from "@/graphql/services/account.js";

const router = express.Router();

async function parseStripeEvent(req: express.Request) {
  try {
    const signature = req.headers["stripe-signature"];
    if (!signature) {
      throw new Error("Stripe webhook signature missing");
    }
    const event: Stripe.Event = stripe.webhooks.constructEvent(
      req.body,
      signature,
      config.get("stripe.webhookSecret"),
    );
    return event;
  } catch (err) {
    throw new HTTPError(400, "Stripe webhook signature verification failed");
  }
}

router.post(
  "/stripe/event-handler",
  bodyParser.raw({ type: "application/json" }),
  asyncHandler(async (req, res) => {
    const event = await parseStripeEvent(req);
    try {
      await handleStripeEvent(event);
    } catch (error) {
      Sentry.setContext("stripeEvent", event);

      throw new HTTPError(
        500,
        "An error occurred while handling Stripe event.",
        {
          cause: error,
        },
      );
    }
    res.sendStatus(200);
  }),
);

router.post(
  "/stripe/create-customer-portal-session",
  auth,
  bodyParser.json(),
  asyncHandler(async (req, res) => {
    try {
      const { stripeCustomerId, accountId } = req.body;
      const user = req.auth?.user;

      if (!user) {
        throw new Error("User not logged in");
      }

      if (!stripeCustomerId) {
        throw new Error("Stripe customer id missing");
      }

      if (!accountId) {
        throw new Error("Account id missing");
      }

      const account = await getAdminAccount({
        id: accountId,
        user,
      });

      if (account.stripeCustomerId !== stripeCustomerId) {
        throw new Error("Stripe customer id mismatch");
      }

      const session = await stripe.billingPortal.sessions.create({
        customer: stripeCustomerId,
        return_url: new URL(
          `/${account.slug}/settings`,
          config.get("server.url"),
        ).href,
      });
      if (!session.url) {
        throw new Error("No session url");
      }

      res.json({ sessionUrl: session.url });
    } catch (err) {
      logger.error(
        "An error occurred while creating Stripe portal session.",
        err,
      );
      res.redirect(302, "/error");
    }
  }),
);

router.post(
  "/stripe/create-checkout-session",
  auth,
  bodyParser.json(),
  asyncHandler(async (req, res) => {
    try {
      const { accountId, successUrl, cancelUrl } = req.body;

      if (!req.auth) {
        throw new Error("Unauthenticated");
      }

      if (!accountId) {
        throw new Error("AccountId missing");
      }

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

      if (!session.url) {
        throw new Error("No session url");
      }

      res.json({ sessionUrl: session.url });
    } catch (err) {
      logger.error(
        "An error occurred while creating Stripe checkout session.",
        err,
      );
      res.redirect(302, "/error");
    }
  }),
);

export default router;
