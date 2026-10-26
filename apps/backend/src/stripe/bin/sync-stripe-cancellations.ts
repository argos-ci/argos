#!/usr/bin/env node
import logger from "@/logger";
import { syncStripeCancellations } from "@/stripe";

/**
 * One-off backfill of the cancellation details mirrored on `subscriptions`.
 *
 * The webhooks keep them current from then on; this fills in the rows that
 * were canceled before they were mirrored at all.
 */
const count = await syncStripeCancellations();
logger.info(`${count} subscription cancellations mirrored`);

// The database pool would hold the process open otherwise.
process.exit(0);
