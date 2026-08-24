#!/usr/bin/env node
import logger from "@/logger";

import { syncGithubMarketplacePlanPrices } from "../marketplace";

/**
 * The recurring refresh runs as the `github-marketplace-prices` cron in the
 * worker; this hand-run form exists to price the plans right after a deploy
 * rather than waiting for the next pass.
 */
const count = await syncGithubMarketplacePlanPrices();
logger.info(`${count} plans priced from the Marketplace listing`);

// The database pool would hold the process open otherwise.
process.exit(0);
