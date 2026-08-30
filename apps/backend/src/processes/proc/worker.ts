import "../setup";
import { checkExpiringSamlCertificates } from "@/auth/saml-certificate-expiration";
import { job as automationActionRunJob } from "@/automation/job";
import { job as buildJob } from "@/build";
import { job as buildNotificationJob } from "@/build-notification";
import config from "@/config";
import { job as deploymentNotificationJob } from "@/deployment-notification";
import { reconcilePendingCustomDomains } from "@/deployment/custom-domain";
import { githubPullRequestJob } from "@/github-pull-request/job";
import { syncGithubMarketplacePlanPrices } from "@/github/marketplace";
import { createJobWorker } from "@/job-core";
import logger from "@/logger";
import { mediaDiffJob } from "@/media/diff-job";
import { purgeExpiredMedia } from "@/media/purge";
import { notificationMessageJob } from "@/notification/message-job";
import { notificationWorkflowJob } from "@/notification/workflow-job";
import { originPullRequestJob } from "@/origin-pull-request/job";
import { originInstallationSyncJob } from "@/origin/synchronize-job";
import { job as screenshotDiffJob } from "@/screenshot-diff";
import { checkIsStripeConfigured } from "@/stripe";
import { syncStripeInvoices } from "@/stripe/invoice-mirror";
import { job as synchronizeJob } from "@/synchronize";
import { scheduleCron } from "@/util/cron";

// Even though prod-ro queues are local, every job handler writes to the
// database and to third parties — nothing a worker does makes sense against
// production data, so it refuses to run at all.
if (config.get("target") === "prod-ro") {
  logger.warn(
    "ARGOS_TARGET=prod-ro: the worker does not run against production data, exiting.",
  );
  process.exit(0);
}

// Custom domains wait on CloudFront to issue their certificate, which happens
// minutes to hours after the customer points their DNS and is not announced.
// Five minutes keeps "add a domain, see it go live" a session-length wait.
scheduleCron("custom-domain-reconcile", "*/5 * * * *", () =>
  reconcilePendingCustomDomains(),
);

scheduleCron("saml-certificate-expiration", "0 * * * *", (context) =>
  checkExpiringSamlCertificates(context.date),
);

// Media retention. Hourly rather than daily: a 30-day promise measured in hours
// is a promise, and a purge that only runs at midnight piles a day of deletions
// into one pass.
scheduleCron("media-retention", "15 * * * *", (context) =>
  purgeExpiredMedia(context.date),
);

// The safety net under the invoice webhooks: re-reads a window wide enough to
// catch anything a missed delivery left behind. Daily, because the webhooks
// are the live path — the sweep only has to beat an operator noticing.
scheduleCron("stripe-invoice-sync", "45 4 * * *", async (context) => {
  if (!checkIsStripeConfigured()) {
    return;
  }
  const since = new Date(context.date.getTime() - 35 * 24 * 3600 * 1000);
  await syncStripeInvoices({ since });
});

// The Marketplace listing's prices, onto the plans — what the revenue page
// multiplies the active marketplace subscriptions by.
scheduleCron("github-marketplace-prices", "35 4 * * *", async () => {
  if (!config.get("github.appId")) {
    return;
  }
  await syncGithubMarketplacePlanPrices();
});

createJobWorker(
  automationActionRunJob,
  buildJob,
  buildNotificationJob,
  deploymentNotificationJob,
  githubPullRequestJob,
  mediaDiffJob,
  notificationMessageJob,
  notificationWorkflowJob,
  originInstallationSyncJob,
  originPullRequestJob,
  synchronizeJob,
  screenshotDiffJob,
);
