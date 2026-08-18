import express, { Router } from "express";
import { z } from "zod";

import config from "@/config";
import { Account } from "@/database/models";
import logger from "@/logger";
import {
  getAppOriginApi,
  handleOriginEvent,
  OriginWebhookDeliverySchema,
  synchronizeOriginInstallation,
  upsertOriginInstallation,
  verifyInstallationReceipt,
  verifyOriginInstallState,
  verifyOriginWebhook,
} from "@/origin";
import { getRedisClient } from "@/util/redis/client";

import { asyncHandler } from "../util";

const router = Router();

/**
 * Remember a delivery for a day so a retry of one we already acknowledged is
 * ignored: Origin delivers at least once.
 */
async function claimDelivery(deliveryId: string): Promise<boolean> {
  const client = await getRedisClient();
  const result = await client.set(
    `origin-webhook-delivery.${deliveryId}`,
    "1",
    {
      NX: true,
      EX: 24 * 60 * 60,
    },
  );
  return result === "OK";
}

router.post(
  "/origin/event-handler",
  express.raw({ type: "*/*", limit: "5mb" }),
  asyncHandler(async (req, res) => {
    const body: unknown = req.body;
    if (!Buffer.isBuffer(body)) {
      res.status(400).send("Missing body");
      return;
    }

    if (!(await verifyOriginWebhook(body, req.headers))) {
      res.status(401).send("Invalid signature");
      return;
    }

    const delivery = OriginWebhookDeliverySchema.safeParse(
      JSON.parse(body.toString("utf8")),
    );
    if (!delivery.success) {
      res.status(400).send("Invalid delivery");
      return;
    }

    if (
      delivery.data.appId &&
      delivery.data.appId !== config.get("origin.appId")
    ) {
      res.status(400).send("Unexpected app");
      return;
    }

    if (!(await claimDelivery(delivery.data.deliveryId))) {
      res.status(200).send("Already processed");
      return;
    }

    try {
      await handleOriginEvent(delivery.data);
    } catch (error) {
      logger.error(
        { error, type: delivery.data.event.type },
        "Origin webhook handler error",
      );
      // A 5xx makes Origin retry the delivery, which is what we want for a
      // transient failure — so the claim must not stick.
      const client = await getRedisClient();
      await client.del(`origin-webhook-delivery.${delivery.data.deliveryId}`);
      throw error;
    }

    res.status(200).send("OK");
  }),
);

const InstallQuerySchema = z.object({
  installation_receipt: z.string(),
});

/**
 * Where Origin sends the workspace admin after approving the installation.
 * The receipt proves the approval, the state (that we signed) names the Argos
 * account to link the installation to.
 */
router.get(
  "/origin/install",
  asyncHandler(async (req, res) => {
    const query = InstallQuerySchema.safeParse(req.query);
    if (!query.success) {
      res.status(400).send("Missing installation receipt");
      return;
    }

    const receipt = await verifyInstallationReceipt(
      query.data.installation_receipt,
    );
    if (!receipt) {
      res.status(400).send("Invalid installation receipt");
      return;
    }

    const state = receipt.state
      ? verifyOriginInstallState(receipt.state)
      : null;
    if (!state) {
      res.status(400).send("Invalid state");
      return;
    }

    const account = await Account.query().findById(state.accountId);
    if (!account) {
      res.status(400).send("Invalid account");
      return;
    }

    const remote = await getAppOriginApi().getAppInstallation(
      receipt.installationId,
    );
    const installation = await upsertOriginInstallation({
      ...remote,
      deleted: false,
    });

    await account.$query().patch({ originInstallationId: installation.id });
    await synchronizeOriginInstallation(installation.id);

    const url = new URL(
      `/${account.slug}/settings#cursor-origin`,
      config.get("server.url"),
    );
    res.redirect(String(url));
  }),
);

export const apiMiddleware: Router = router;
