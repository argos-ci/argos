import bodyParser from "body-parser";
import express from "express";

import config from "@argos-ci/config";
import { Account, Plan } from "@argos-ci/database/models";
import logger from "@argos-ci/logger";
import {
  createStripeCheckoutSession,
  handleStripeEvent,
  stripe,
} from "@argos-ci/stripe";
import type { Stripe } from "@argos-ci/stripe";

import { auth } from "../middlewares/auth.js";
import { asyncHandler } from "../util.js";

const router = express.Router();

router.post(
  "/stripe/event-handler",
  bodyParser.raw({ type: "application/json" }),
  asyncHandler(async (req, res) => {
    try {
      const signature = req.headers["stripe-signature"];
      if (!signature) {
        throw new Error("Stripe webhook signature missing");
      }
      const event: Stripe.Event = stripe.webhooks.constructEvent(
        req.body,
        signature,
        config.get("stripe.webhookSecret")
      );
      logger.info("Stripe event", event.type);
      await handleStripeEvent(event);
    } catch (err) {
      throw new Error("Stripe webhook signature verification failed");
    }
    res.sendStatus(200);
  })
);

router.post(
  "/stripe/create-customer-portal-session",
  auth,
  bodyParser.json(),
  asyncHandler(async (req, res) => {
    try {
      const { stripeCustomerId } = req.body;
      const user = req.auth?.user;

      if (!user) {
        throw new Error("User not logged in");
      }

      if (!stripeCustomerId) {
        throw new Error("Stripe customer id missing");
      }

      const account = await Account.query()
        .findOne({ stripeCustomerId })
        .throwIfNotFound({
          message: `No account found with stripeCustomerId: "${stripeCustomerId}"`,
        });

      if (!account.$checkWritePermission(user)) {
        throw new Error("Unauthorized");
      }

      const session = await stripe.billingPortal.sessions.create({
        customer: stripeCustomerId,
        return_url: new URL(
          `/${account.slug}/settings`,
          config.get("server.url")
        ).href,
      });
      if (!session.url) {
        throw new Error("No session url");
      }

      res.json({ sessionUrl: session.url });
    } catch (err) {
      logger.error(
        "An error occurred while creating Stripe portal session.",
        err
      );
      res.redirect(302, "/error");
    }
  })
);

router.post(
  "/stripe/create-checkout-session",
  auth,
  bodyParser.json(),
  asyncHandler(async (req, res) => {
    try {
      const { accountId } = req.body;
      const user = req.auth?.user;

      if (!user) {
        throw new Error("User not logged in");
      }

      if (!accountId) {
        throw new Error("AccountId missing");
      }

      const [teamAccount, proPlan] = await Promise.all([
        Account.query().findOne({ id: accountId }),
        Plan.query().findOne({ name: "pro", usageBased: true }),
      ]);

      if (!teamAccount) {
        throw new Error("Team account not found");
      }
      if (!teamAccount.$checkWritePermission(user)) {
        throw new Error("Unauthorized");
      }
      if (!proPlan) {
        throw new Error("Pro plan not found");
      }

      const session = await createStripeCheckoutSession({
        plan: proPlan,
        account: teamAccount,
        purchaserId: user.id,
        // prettier-ignore
        successUrl: new URL(`${teamAccount.slug}?checkout=success`, config.get('server.url')).href,
        // prettier-ignore
        cancelUrl: new URL(`${teamAccount.slug}?checkout=cancel`, config.get('server.url')).href,
      });
      if (!session.url) {
        throw new Error("No session url");
      }

      res.json({ sessionUrl: session.url });
    } catch (err) {
      logger.error(
        "An error occurred while creating Stripe checkout session.",
        err
      );
      res.redirect(302, "/error");
    }
  })
);

export default router;
