import { invariant } from "@argos/util/invariant";
import * as Sentry from "@sentry/node";
import bodyParser from "body-parser";
import express from "express";

import config from "@/config/index.js";
import { getAdminAccount } from "@/graphql/services/account.js";
import logger from "@/logger/index.js";
import {
  createStripeCheckoutSession,
  getStripeProPlanOrThrow,
  handleStripeEvent,
  stripe,
} from "@/stripe/index.js";
import type { Stripe } from "@/stripe/index.js";

import { auth } from "../middlewares/auth.js";
import { asyncHandler, boom } from "../util.js";

const router = express.Router();

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
  bodyParser.raw({ type: "application/json" }),
  asyncHandler(async (req, res) => {
    const event = await parseStripeEvent(req);
    try {
      await handleStripeEvent(event);
    } catch (error) {
      Sentry.setContext("stripeEvent", event);

      throw boom(500, "An error occurred while handling Stripe event.", {
        cause: error,
      });
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
