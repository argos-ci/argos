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
  "/create-checkout-session",
  auth,
  bodyParser.json(),
  async (req: express.Request, res: express.Response): Promise<void> => {
    try {
      const { accountId } = req.body;

      const auth = req.auth;
      if (!auth) {
        throw new Error("auth missing");
      }

      if (!accountId) {
        throw new Error("account id missing");
      }

      const account = await Account.query()
        .first()
        .throwIfNotFound({
          message: `no account found with id: "${accountId}"`,
        });

      const proPlan = await Plan.query()
        .findOne({ name: "pro", usageBased: true })
        .throwIfNotFound({ message: "Pro plan not found" });

      const price = await getProductPriceOrThrow(proPlan);

      const clientReferenceId = Account.encodeStripeClientReferenceId({
        accountId: account.id,
        purchaserId: auth.user.id,
      });

      const session = await stripe.checkout.sessions.create({
        line_items: [{ price: price.id }],
        subscription_data: {
          trial_settings: {
            end_behavior: { missing_payment_method: "cancel" },
          },
          trial_period_days: 14,
          description: `Argos Pro plan for ${account.slug}`,
        },
        mode: "subscription",
        client_reference_id: clientReferenceId,
        success_url: new URL(
          `${account.slug}/settings?checkout=success#plan`,
          config.get("server.url")
        ).href,
        cancel_url: new URL(
          `${account.slug}/settings?checkout=cancel#plan`,
          config.get("server.url")
        ).href,
        payment_method_collection: "if_required",
        automatic_tax: { enabled: true },
      });
      if (!session.url) throw new Error("No session url");
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
