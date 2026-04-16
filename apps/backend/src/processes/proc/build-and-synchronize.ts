import "../setup";

import { checkExpiringSamlCertificates } from "@/auth/saml-certificate-expiration";
import { job as automationActionRunJob } from "@/automation/job";
import { job as buildJob } from "@/build";
import { job as buildNotificationJob } from "@/build-notification";
import { githubPullRequestJob } from "@/github-pull-request/job";
import { createJobWorker } from "@/job-core";
import { notificationMessageJob } from "@/notification/message-job";
import { notificationWorkflowJob } from "@/notification/workflow-job";
import { job as synchronizeJob } from "@/synchronize";
import { scheduleCron } from "@/util/cron";

scheduleCron("saml-certificate-expiration", "0 * * * *", (context) =>
  checkExpiringSamlCertificates(context.date),
);

createJobWorker(
  automationActionRunJob,
  buildJob,
  buildNotificationJob,
  githubPullRequestJob,
  notificationMessageJob,
  notificationWorkflowJob,
  synchronizeJob,
);
