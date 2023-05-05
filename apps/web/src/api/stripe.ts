import bodyParser from "body-parser";
import express from "express";

import config from "@argos-ci/config";
import { Account, Plan } from "@argos-ci/database/models";
import logger from "@argos-ci/logger";
import {
  createStripeCheckoutSession,
  findOrCreateTeamAccountOrThrow,
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
  async (req: express.Request, res: express.Response): Promise<void> => {
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
  }
);

router.post(
  "/stripe/create-customer-portal-session",
  express.urlencoded({ extended: false }),
  asyncHandler(async (req, res) => {
    try {
      const { stripeCustomerId } = req.body;
      if (!stripeCustomerId) {
        throw new Error("stripe customer id missing");
      }

      const account = await Account.query()
        .findOne({ stripeCustomerId })
        .throwIfNotFound({
          message: `no account found with stripeCustomerId: "${stripeCustomerId}"`,
        });

      const portalSession = await stripe.billingPortal.sessions.create({
        customer: stripeCustomerId,
        return_url: new URL(
          `/${account.slug}/settings`,
          config.get("server.url")
        ).href,
      });

      res.redirect(302, portalSession.url);
    } catch (err) {
      logger.error("Error creating customer portal session", err);
      res.redirect(302, "/error");
    }
  })
);

router.post(
  "/stripe/create-checkout-session",
  auth,
  bodyParser.json(),
  async (req: express.Request, res: express.Response): Promise<void> => {
    try {
      const { name, slug } = req.body;

      const auth = req.auth;
      if (!auth) {
        throw new Error("auth missing");
      }

      const [account, proPlan] = await Promise.all([
        findOrCreateTeamAccountOrThrow({ slug, name }),
        Plan.query().findOne({ name: "pro", usageBased: true }),
      ]);

      if (!proPlan) {
        throw new Error("Pro plan not found");
      }

      const session = await createStripeCheckoutSession({
        plan: proPlan,
        account,
        purchaserId: auth.user.id,
        successUrl: new URL(
          `${account.slug}?checkout=success`,
          config.get("server.url")
        ).href,
        cancelUrl: new URL(
          `${account.slug}?checkout=cancel`,
          config.get("server.url")
        ).href,
      });
      res.json({ sessionUrl: session.url });
    } catch (err) {
      logger.error("Error creating checkout session", err);
      res.status(400).json({
        message:
          err instanceof Error
            ? err.message
            : "An error occurred while creating the checkout session",
      });
    }
  }
);

export default router;
