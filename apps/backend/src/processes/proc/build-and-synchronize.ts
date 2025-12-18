import "../setup";

import { job as automationActionRunJob } from "@/automation/job";
import { job as buildJob } from "@/build";
import { job as buildNotificationJob } from "@/build-notification";
import { job as ghPullRequestJob } from "@/github-pull-request";
import { createJobWorker } from "@/job-core";
import { notificationMessageJob } from "@/notification/message-job";
import { notificationWorkflowJob } from "@/notification/workflow-job";
import { job as synchronizeJob } from "@/synchronize";

createJobWorker(
  automationActionRunJob,
  buildJob,
  buildNotificationJob,
  ghPullRequestJob,
  notificationMessageJob,
  notificationWorkflowJob,
  synchronizeJob,
);
