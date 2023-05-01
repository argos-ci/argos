import bodyParser from "body-parser";
import express from "express";

import config from "@argos-ci/config";
import { Account, Plan } from "@argos-ci/database/models";
import logger from "@argos-ci/logger";
import {
  getProductPriceOrThrow,
  handleStripeEvent,
  stripe,
} from "@argos-ci/stripe";
import type { Stripe } from "@argos-ci/stripe";

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
  "/create-checkout-session",
  express.urlencoded({ extended: false }),
  asyncHandler(async (req, res) => {
    try {
      const { accountSlug, stripeClientReferenceId } = req.body;
      if (!stripeClientReferenceId) {
        throw new Error("client reference id missing");
      }

      const proPlan = await Plan.query()
        .findOne({ name: "pro", usageBased: true })
        .throwIfNotFound({ message: "Pro plan not found" });

      const price = await getProductPriceOrThrow(proPlan);

      const session = await stripe.checkout.sessions.create({
        line_items: [{ price: price.id }],
        subscription_data: {
          trial_settings: {
            end_behavior: { missing_payment_method: "cancel" },
          },
          trial_period_days: 14,
        },
        mode: "subscription",
        client_reference_id: stripeClientReferenceId,
        success_url: new URL(
          `${accountSlug}/settings?checkout=success#plan`,
          config.get("server.url")
        ).href,
        cancel_url: new URL(
          `${accountSlug}/settings?checkout=cancel#plan`,
          config.get("server.url")
        ).href,
        payment_method_collection: "if_required",
        automatic_tax: { enabled: true },
      });
      res.redirect(302, session.url as string);
    } catch (err) {
      logger.error("Error creating checkout session", err);
      res.redirect(302, "/error");
    }
  })
);

export default router;
