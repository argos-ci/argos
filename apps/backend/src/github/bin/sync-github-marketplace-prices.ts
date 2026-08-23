#!/usr/bin/env node
import { callbackify } from "node:util";

import logger from "@/logger";

import { syncGithubMarketplacePlanPrices } from "../marketplace";

/**
 * The recurring refresh runs as the `github-marketplace-prices` cron in the
 * worker; this hand-run form exists to price the plans right after a deploy
 * rather than waiting for the next pass.
 */
const main = callbackify(async () => {
  const count = await syncGithubMarketplacePlanPrices();
  logger.info(`${count} plans priced from the Marketplace listing`);
});

main((err) => {
  if (err) {
    throw err;
  }
});
