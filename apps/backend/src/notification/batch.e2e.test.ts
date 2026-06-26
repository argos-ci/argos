import { invariant } from "@argos/util/invariant";
import { beforeEach, describe, expect, it, vi } from "vitest";

import config from "@/config";
import {
  Account,
  Build,
  NotificationBatch,
  NotificationBatchItem,
  NotificationMessage,
  NotificationWorkflow,
  NotificationWorkflowRecipient,
  Project,
  UserNotificationPreference,
} from "@/database/models";
import { factory, setupDatabase } from "@/database/testing";
import { emailToText } from "@/email/util";

import { reviewBuildBatchKey } from "./batch";
import {
  notificationBatchJob,
  processNotificationBatch,
  queueDueNotificationBatches,
} from "./batch-job";
import { handler as reviewActivitySummaryHandler } from "./handlers/review_activity_summary";
import { notificationMessageJob } from "./message-job";
import { notificationWorkflowJob, processWorkflow } from "./workflow-job";

type WorkflowType = NotificationWorkflow["type"];

const PAST = new Date("2020-01-01T00:00:00.000Z").toISOString();

/**
 * Insert a notification workflow plus its recipients directly, mirroring what
 * `sendNotification` persists (without pushing to the queue).
 */
async function insertWorkflow(input: {
  type: WorkflowType;
  data: Record<string, unknown>;
  recipientUserIds: string[];
  batchKey: string | null;
}): Promise<NotificationWorkflow> {
  const workflow = await NotificationWorkflow.query().insertAndFetch({
    type: input.type,
    data: input.data as any,
    jobStatus: "pending",
    batchKey: input.batchKey,
  });
  await NotificationWorkflowRecipient.query().insert(
    input.recipientUserIds.map((userId) => ({
      workflowId: workflow.id,
      userId,
    })),
  );
  return workflow;
}

describe("notification batching", () => {
  let project: Project;
  let account: Account;
  let build: Build;

  /** Build review/comment notification data for the test build. */
  function commentData(extra: Record<string, unknown> = {}) {
    return {
      accountSlug: account.slug,
      projectName: project.name,
      buildNumber: 1,
      buildName: build.name,
      commentUrl: `https://app.argos-ci.com/${account.slug}/${project.name}/builds/1#comment-1`,
      authorName: "Jane Doe",
      bodyHtml: "<p>Could you double-check this?</p>",
      ...extra,
    };
  }

  async function createRecipient(): Promise<string> {
    const userAccount = await factory.UserAccount.create();
    invariant(userAccount.userId);
    return userAccount.userId;
  }

  beforeEach(async () => {
    await setupDatabase();
    // Avoid touching the queue: the jobs are exercised by calling their perform
    // functions directly.
    vi.restoreAllMocks();
    vi.spyOn(notificationWorkflowJob, "push").mockResolvedValue(undefined);
    vi.spyOn(notificationMessageJob, "push").mockResolvedValue(undefined);
    vi.spyOn(notificationBatchJob, "push").mockResolvedValue(undefined);

    account = await factory.TeamAccount.create();
    project = await factory.Project.create({ accountId: account.id });
    build = await factory.Build.create({ projectId: project.id });
  });

  it("rolls two events on the same build and recipient into one batch", async () => {
    const userId = await createRecipient();
    const batchKey = reviewBuildBatchKey(build.id);
    const first = await insertWorkflow({
      type: "comment_added",
      data: commentData(),
      recipientUserIds: [userId],
      batchKey,
    });
    const second = await insertWorkflow({
      type: "comment_replied",
      data: commentData(),
      recipientUserIds: [userId],
      batchKey,
    });

    await processWorkflow(first);
    await processWorkflow(second);

    const batches = await NotificationBatch.query();
    expect(batches).toHaveLength(1);
    expect(batches[0]!.userId).toBe(userId);
    expect(batches[0]!.batchKey).toBe(batchKey);

    const items = await NotificationBatchItem.query().where({
      batchId: batches[0]!.id,
    });
    expect(items).toHaveLength(2);

    // No emails are sent yet; the digest waits for the flush.
    const messages = await NotificationMessage.query();
    expect(messages).toHaveLength(0);
  });

  it("creates a separate batch per recipient", async () => {
    const [userA, userB] = await Promise.all([
      createRecipient(),
      createRecipient(),
    ]);
    const workflow = await insertWorkflow({
      type: "comment_added",
      data: commentData(),
      recipientUserIds: [userA, userB],
      batchKey: reviewBuildBatchKey(build.id),
    });

    await processWorkflow(workflow);

    const batches = await NotificationBatch.query();
    expect(batches).toHaveLength(2);
    expect(new Set(batches.map((batch) => batch.userId))).toEqual(
      new Set([userA, userB]),
    );
  });

  it("creates a separate batch per build", async () => {
    const userId = await createRecipient();
    const otherBuild = await factory.Build.create({ projectId: project.id });
    const first = await insertWorkflow({
      type: "comment_added",
      data: commentData(),
      recipientUserIds: [userId],
      batchKey: reviewBuildBatchKey(build.id),
    });
    const second = await insertWorkflow({
      type: "comment_added",
      data: commentData(),
      recipientUserIds: [userId],
      batchKey: reviewBuildBatchKey(otherBuild.id),
    });

    await processWorkflow(first);
    await processWorkflow(second);

    const batches = await NotificationBatch.query();
    expect(batches).toHaveLength(2);
    expect(new Set(batches.map((batch) => batch.batchKey))).toEqual(
      new Set([
        reviewBuildBatchKey(build.id),
        reviewBuildBatchKey(otherBuild.id),
      ]),
    );
  });

  it("does not duplicate items when the workflow job is retried", async () => {
    const userId = await createRecipient();
    const workflow = await insertWorkflow({
      type: "comment_added",
      data: commentData(),
      recipientUserIds: [userId],
      batchKey: reviewBuildBatchKey(build.id),
    });

    await processWorkflow(workflow);
    // Simulate a retry of the same workflow job.
    await processWorkflow(workflow);

    const batches = await NotificationBatch.query();
    expect(batches).toHaveLength(1);
    const items = await NotificationBatchItem.query();
    expect(items).toHaveLength(1);
  });

  it("delivers exactly one digest for a due batch", async () => {
    const userId = await createRecipient();
    const batchKey = reviewBuildBatchKey(build.id);
    const commentWorkflow = await insertWorkflow({
      type: "comment_added",
      data: commentData(),
      recipientUserIds: [userId],
      batchKey,
    });
    const reactionWorkflow = await insertWorkflow({
      type: "comment_reaction",
      data: commentData({
        commentAuthorId: userId,
        reactorName: "Bob",
        emoji: "👍",
      }),
      recipientUserIds: [userId],
      batchKey,
    });

    await processWorkflow(commentWorkflow);
    await processWorkflow(reactionWorkflow);

    const batch = await NotificationBatch.query().first();
    invariant(batch);
    // Make it due now and flush.
    await batch.$query().patch({ deliverAfter: PAST });
    const queued = await queueDueNotificationBatches(new Date());
    expect(queued).toEqual([batch.id]);
    expect(notificationBatchJob.push).toHaveBeenCalledWith(batch.id);

    const closed = await NotificationBatch.query().findById(batch.id);
    invariant(closed);
    expect(closed.closedAt).not.toBeNull();

    await processNotificationBatch(closed);

    const digests = await NotificationWorkflow.query().where({
      type: "review_activity_summary",
    });
    expect(digests).toHaveLength(1);
    const digest = digests[0]!;
    expect((digest.data as any).totalCount).toBe(2);
    expect((digest.data as any).activities).toHaveLength(2);

    const digestRecipients = await NotificationWorkflowRecipient.query().where({
      workflowId: digest.id,
    });
    expect(digestRecipients.map((r) => r.userId)).toEqual([userId]);

    const afterFlush = await NotificationBatch.query().findById(batch.id);
    expect(afterFlush!.digestWorkflowId).toBe(digest.id);
  });

  it("does not batch for a recipient who opted out of review notifications", async () => {
    const userId = await createRecipient();
    await UserNotificationPreference.query().insert({
      userId,
      category: "review",
      channel: "email",
      enabled: false,
    });
    const workflow = await insertWorkflow({
      type: "comment_added",
      data: commentData(),
      recipientUserIds: [userId],
      batchKey: reviewBuildBatchKey(build.id),
    });

    await processWorkflow(workflow);

    const batches = await NotificationBatch.query();
    expect(batches).toHaveLength(0);
  });

  it("suppresses the digest when the recipient opts out before the flush", async () => {
    const userId = await createRecipient();
    const workflow = await insertWorkflow({
      type: "comment_added",
      data: commentData(),
      recipientUserIds: [userId],
      batchKey: reviewBuildBatchKey(build.id),
    });

    // The user is still opted in when the batch is created.
    await processWorkflow(workflow);
    const batch = await NotificationBatch.query().first();
    invariant(batch);

    // They opt out before the batch flushes.
    await UserNotificationPreference.query().insert({
      userId,
      category: "review",
      channel: "email",
      enabled: false,
    });

    await batch.$query().patch({ deliverAfter: PAST });
    await queueDueNotificationBatches(new Date());
    const closed = await NotificationBatch.query().findById(batch.id);
    invariant(closed);
    await processNotificationBatch(closed);

    const digests = await NotificationWorkflow.query().where({
      type: "review_activity_summary",
    });
    expect(digests).toHaveLength(0);
    const afterFlush = await NotificationBatch.query().findById(batch.id);
    expect(afterFlush!.digestWorkflowId).toBeNull();
  });

  it("sends immediately when the workflow has no batchKey", async () => {
    const userId = await createRecipient();
    const workflow = await insertWorkflow({
      type: "comment_added",
      data: commentData(),
      recipientUserIds: [userId],
      batchKey: null,
    });

    await processWorkflow(workflow);

    const batches = await NotificationBatch.query();
    expect(batches).toHaveLength(0);
    const messages = await NotificationMessage.query().where({
      workflowId: workflow.id,
    });
    expect(messages).toHaveLength(1);
    expect(notificationMessageJob.push).toHaveBeenCalledTimes(1);
  });

  it("sends immediately when batching is disabled by config", async () => {
    config.set("notifications.reviewBatching.enabled", false);
    try {
      const userId = await createRecipient();
      const workflow = await insertWorkflow({
        type: "comment_added",
        data: commentData(),
        recipientUserIds: [userId],
        batchKey: reviewBuildBatchKey(build.id),
      });

      await processWorkflow(workflow);

      const batches = await NotificationBatch.query();
      expect(batches).toHaveLength(0);
      const messages = await NotificationMessage.query().where({
        workflowId: workflow.id,
      });
      expect(messages).toHaveLength(1);
    } finally {
      config.set("notifications.reviewBatching.enabled", true);
    }
  });

  it("renders the digest email", async () => {
    const rendered = reviewActivitySummaryHandler.email({
      ...reviewActivitySummaryHandler.previewData,
      ctx: {
        user: { id: "preview-user", name: "James" },
        preferencesUrl: null,
      },
    });
    expect(rendered.subject).toBe(
      "[argos/my-project] 4 new updates on build default #42",
    );
    const html = await emailToText(rendered);
    // Reactions from two people aggregate into a single line.
    expect(html).toContain("Jane Doe and Bob");
    expect(html).toContain("your comment");
  });
});
