import bodyParser from "body-parser";
import express from "express";
// @ts-ignore
import { HttpError } from "express-err";

import config from "@argos-ci/config";
import { Account } from "@argos-ci/database/models";
import logger from "@argos-ci/logger";
import {
  createStripeCheckoutSession,
  getStripeProPlanOrThrow,
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
        config.get("stripe.webhookSecret"),
      );
      logger.info("Stripe event", event.type);
      await handleStripeEvent(event);
    } catch (err) {
      throw new HttpError(400, "Stripe webhook signature verification failed");
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

      const account = await Account.query()
        .findById(accountId)
        .throwIfNotFound();

      if (account.stripeCustomerId !== stripeCustomerId) {
        throw new Error("Stripe customer id mismatch");
      }

      if (!account.$checkWritePermission(user)) {
        throw new Error("Unauthorized");
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
        Account.query().findById(accountId).throwIfNotFound(),
        getStripeProPlanOrThrow(),
        req.auth.account.$checkHasSubscribedToTrial(),
      ]);

      const hasWritePermission = await teamAccount.$checkWritePermission(
        req.auth.user,
      );

      if (!hasWritePermission) {
        throw new Error("Unauthorized");
      }

      const session = await createStripeCheckoutSession({
        plan: proPlan,
        teamAccount,
        purchaserAccount: req.auth.account,
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
