import "../setup";
import { checkExpiringSamlCertificates } from "@/auth/saml-certificate-expiration";
import { job as automationActionRunJob } from "@/automation/job";
import { job as buildJob } from "@/build";
import { job as buildNotificationJob } from "@/build-notification";
import { job as deploymentNotificationJob } from "@/deployment-notification";
import { githubPullRequestJob } from "@/github-pull-request/job";
import { createJobWorker } from "@/job-core";
import { mediaDiffJob } from "@/media/diff-job";
import { purgeExpiredMedia } from "@/media/purge";
import { notificationMessageJob } from "@/notification/message-job";
import { notificationWorkflowJob } from "@/notification/workflow-job";
import { originPullRequestJob } from "@/origin-pull-request/job";
import { job as screenshotDiffJob } from "@/screenshot-diff";
import { job as synchronizeJob } from "@/synchronize";
import { scheduleCron } from "@/util/cron";

scheduleCron("saml-certificate-expiration", "0 * * * *", (context) =>
  checkExpiringSamlCertificates(context.date),
);

// Media retention. Hourly rather than daily: a 30-day promise measured in hours
// is a promise, and a purge that only runs at midnight piles a day of deletions
// into one pass.
scheduleCron("media-retention", "15 * * * *", (context) =>
  purgeExpiredMedia(context.date),
);

createJobWorker(
  automationActionRunJob,
  buildJob,
  buildNotificationJob,
  deploymentNotificationJob,
  githubPullRequestJob,
  mediaDiffJob,
  notificationMessageJob,
  notificationWorkflowJob,
  originPullRequestJob,
  synchronizeJob,
  screenshotDiffJob,
);
