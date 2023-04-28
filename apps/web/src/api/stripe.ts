import bodyParser from "body-parser";
import express from "express";

import config from "@argos-ci/config";
import { Account } from "@argos-ci/database/models";
import logger from "@argos-ci/logger";
import { handleStripeEvent, stripe } from "@argos-ci/stripe";
import type { Stripe } from "@argos-ci/stripe";

import { asyncHandler } from "../util.js";

const router = express.Router();

router.post(
  "/stripe/event-handler",
  bodyParser.raw({ type: "application/json" }),
  async (req: express.Request, res: express.Response): Promise<void> => {
    let event: Stripe.Event;
    try {
      const signature = req.headers["stripe-signature"];
      if (!signature) {
        throw new Error("Stripe webhook signature missing");
      }
      event = stripe.webhooks.constructEvent(
        req.body,
        signature,
        config.get("stripe.webhookSecret")
      );
    } catch (err) {
      throw new Error("Stripe webhook signature verification failed");
    }
    logger.info("Stripe event", event.type);
    await handleStripeEvent(event);
    res.sendStatus(200);
  }
);

router.post(
  "/stripe/create-customer-portal-session",
  express.urlencoded({ extended: false }),
  asyncHandler(async (req, res) => {
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
      return_url: new URL(`/${account.slug}/settings`, config.get("server.url"))
        .href,
    });

    res.redirect(303, portalSession.url);
  })
);

export default router;
