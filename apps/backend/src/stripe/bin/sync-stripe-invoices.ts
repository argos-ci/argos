#!/usr/bin/env node
import { callbackify } from "node:util";

import logger from "@/logger";

import { syncStripeInvoices } from "../invoice-mirror";

/**
 * Days swept, from the command line.
 *
 * Defaults shallow, for the recurring reconciliation under the webhooks; the
 * one-off backfill passes a deep window instead — 760 covers the 24 months the
 * revenue page can be asked for, with a margin.
 */
const days = Number(process.argv[2] ?? 35);

const main = callbackify(async () => {
  if (!Number.isFinite(days) || days <= 0) {
    throw new Error(`Not a number of days: ${process.argv[2]}`);
  }
  const since = new Date(Date.now() - days * 24 * 3600 * 1000);
  const count = await syncStripeInvoices({ since });
  logger.info(`${count} invoices mirrored since ${since.toISOString()}`);
});

main((err) => {
  if (err) {
    throw err;
  }
});
