import crypto from "node:crypto";
import { assertNever } from "@argos/util/assertNever";
import { invariant } from "@argos/util/invariant";
import express, { RequestHandler, Router } from "express";
import { z } from "zod";

import config from "@/config/index.js";
import { NotificationMessage } from "@/database/models";

import { asyncHandler } from "../util";

const router = Router();

const verifyWebhookSignature: RequestHandler = (req, res, next) => {
  const secret = config.get("resend.webhookSecret");

  if (!secret) {
    res.status(400).send('Missing "resend.webhookSecret"');
    return;
  }

  const svixId = req.headers["svix-id"];
  const svixTimestamp = req.headers["svix-timestamp"];
  const svixSignatureHeader = req.headers["svix-signature"];

  if (
    typeof svixId !== "string" ||
    typeof svixTimestamp !== "string" ||
    typeof svixSignatureHeader !== "string"
  ) {
    res.status(400).send("Missing headers");
    return;
  }

  const svixSignatures = svixSignatureHeader.split(" ").map((s) => {
    const [, value] = s.split(",");
    if (!value) {
      return null;
    }
    return value;
  });

  if (svixSignatures.some((s) => s === null)) {
    res.status(400).send("Invalid signature header");
    return;
  }

  const secretParts = secret.split("_");
  invariant(secretParts[1], 'Secret must be in the format "whsec_<base64>"');
  const secretBytes = Buffer.from(secretParts[1], "base64");
  const message = `${svixId}.${svixTimestamp}.${req.body}`;

  const expectedSignature = crypto
    .createHmac("sha256", secretBytes)
    .update(message)
    .digest("base64");

  if (!svixSignatures.includes(expectedSignature)) {
    res.status(401).send("Invalid signature");
    return;
  }

  next();
};

const EventSchema = z.object({
  type: z.enum(["email.delivered", "email.clicked"]),
  data: z.object({
    email_id: z.string(),
  }),
});

router.post(
  "/resend/event-handler",
  express.text({ type: "*/*" }),
  verifyWebhookSignature,
  asyncHandler(async (req, res) => {
    const body = JSON.parse(req.body);
    const event = EventSchema.parse(body);

    const message = await NotificationMessage.query()
      .where("channel", "email")
      .where("externalId", event.data.email_id)
      .first();

    if (!message) {
      res.status(200).send("Message not found");
      return;
    }

    switch (event.type) {
      case "email.delivered": {
        if (!message.deliveredAt) {
          await message
            .$query()
            .patch({ deliveredAt: new Date().toISOString() });
        }
        break;
      }
      case "email.clicked": {
        if (!message.linkClickedAt) {
          await message
            .$query()
            .patch({ linkClickedAt: new Date().toISOString() });
        }
        break;
      }
      default:
        assertNever(event.type);
    }

    res.status(200).send("Message updated");
  }),
);

export const apiMiddleware: Router = router;
