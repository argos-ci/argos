import { createHmac, randomBytes } from "node:crypto";
import { once } from "node:events";
import { createServer, type IncomingHttpHeaders } from "node:http";
import type { AddressInfo } from "node:net";
import { invariant } from "@argos/util/invariant";
import { describe, expect, test } from "vitest";

import {
  ProjectEvent,
  Webhook,
  WebhookDelivery,
  WebhookProject,
  type Account,
  type Build,
  type Project,
} from "@/database/models";
import { factory, setupDatabase } from "@/database/testing";
import { sendProjectEvent } from "@/event/send";

import { deliverWebhook } from "./job";

type Endpoint = {
  url: string;
  /** Status the endpoint answers with. */
  status: number;
  requests: { headers: IncomingHttpHeaders; body: string }[];
};

type Fixtures = {
  endpoint: Endpoint;
  account: Account;
  project: Project;
  build: Build;
  createWebhook: (
    data: Partial<Pick<Webhook, "events" | "accountId">> & {
      projectIds?: string[];
    },
  ) => Promise<Webhook>;
};

const webhookTest = test.extend<Fixtures>({
  endpoint: async ({}, use) => {
    const requests: Endpoint["requests"] = [];
    const endpoint: Endpoint = { url: "", status: 200, requests };
    const server = createServer((req, res) => {
      const chunks: Buffer[] = [];
      req.on("data", (chunk: Buffer) => chunks.push(chunk));
      req.on("end", () => {
        requests.push({
          headers: req.headers,
          body: Buffer.concat(chunks).toString("utf8"),
        });
        res.writeHead(endpoint.status).end();
      });
    });
    server.listen(0, "127.0.0.1");
    await once(server, "listening");
    const { port } = server.address() as AddressInfo;
    endpoint.url = `http://127.0.0.1:${port}/hooks/argos`;
    await use(endpoint);
    server.close();
  },
  account: async ({}, use) => {
    await setupDatabase();
    await use(await factory.TeamAccount.create());
  },
  project: async ({ account }, use) => {
    await use(await factory.Project.create({ accountId: account.id }));
  },
  build: async ({ project }, use) => {
    await use(await factory.Build.create({ projectId: project.id }));
  },
  createWebhook: async ({ account, endpoint }, use) => {
    await use(async (data) => {
      const { projectIds = [], ...rest } = data;
      const webhook = await Webhook.query().insertAndFetch({
        accountId: account.id,
        url: endpoint.url,
        secret: `whsec_${randomBytes(32).toString("base64")}`,
        events: ["build.completed"],
        allProjects: projectIds.length === 0,
        ...rest,
      });
      if (projectIds.length > 0) {
        await WebhookProject.query().insert(
          projectIds.map((projectId) => ({ webhookId: webhook.id, projectId })),
        );
      }
      return webhook;
    });
  },
});

async function getDeliveries(webhook: Webhook) {
  return WebhookDelivery.query().where("webhookId", webhook.id).orderBy("id");
}

/**
 * Verify a request the way the Standard Webhooks specification describes it,
 * independently from the code that signs it.
 */
function verifySignature(
  request: Endpoint["requests"][number],
  secret: string,
): boolean {
  const id = request.headers["webhook-id"];
  const timestamp = request.headers["webhook-timestamp"];
  const signature = request.headers["webhook-signature"];
  const key = Buffer.from(secret.split("_")[1] ?? "", "base64");
  const expected = createHmac("sha256", key)
    .update(`${id}.${timestamp}.${request.body}`)
    .digest("base64");
  return signature === `v1,${expected}`;
}

describe("webhooks", () => {
  webhookTest(
    "sends an event to the webhooks subscribed to it",
    async ({ account, project, build, createWebhook }) => {
      const otherProject = await factory.Project.create({
        accountId: account.id,
        name: "other-project",
      });
      const otherAccount = await factory.TeamAccount.create();

      const [allProjects, thisProject] = await Promise.all([
        createWebhook({}),
        createWebhook({ projectIds: [project.id] }),
      ]);
      const ignored = await Promise.all([
        createWebhook({ events: ["build.reviewed"] }),
        createWebhook({ projectIds: [otherProject.id] }),
        createWebhook({ accountId: otherAccount.id }),
      ]);

      const event = await sendProjectEvent({ name: "build.completed", build });

      for (const webhook of [allProjects, thisProject]) {
        expect(await getDeliveries(webhook)).toMatchObject([
          { eventId: event.id },
        ]);
      }
      for (const webhook of ignored) {
        expect(await getDeliveries(webhook)).toHaveLength(0);
      }
    },
  );

  webhookTest(
    "records the event even without a webhook",
    async ({ project, build }) => {
      const event = await sendProjectEvent({ name: "build.completed", build });

      expect(await ProjectEvent.query().findById(event.id)).toMatchObject({
        projectId: project.id,
        name: "build.completed",
      });
      expect(await WebhookDelivery.query().resultSize()).toBe(0);
    },
  );

  webhookTest(
    "posts the event signed per Standard Webhooks",
    async ({ project, build, endpoint, createWebhook }) => {
      const webhook = await createWebhook({});
      const event = await sendProjectEvent({ name: "build.completed", build });
      const [delivery] = await getDeliveries(webhook);
      invariant(delivery, "delivery not created");

      await deliverWebhook(delivery);

      expect(endpoint.requests).toHaveLength(1);
      const [request] = endpoint.requests;
      invariant(request);
      expect(request.headers["content-type"]).toBe("application/json");
      expect(request.headers["webhook-id"]).toBe(event.id);
      expect(
        Math.abs(
          Number(request.headers["webhook-timestamp"]) - Date.now() / 1000,
        ),
      ).toBeLessThan(60);
      expect(verifySignature(request, webhook.secret)).toBe(true);
      expect(JSON.parse(request.body)).toEqual({
        id: event.id,
        type: "build.completed",
        timestamp: new Date(event.createdAt).toISOString(),
        data: {
          project: expect.objectContaining({
            id: project.id,
            name: project.name,
          }),
          build: expect.objectContaining({
            id: build.id,
            number: build.number,
          }),
        },
      });

      const delivered = await delivery.$query();
      expect(delivered).toMatchObject({
        attempts: 1,
        conclusion: "success",
        responseStatus: 200,
        failureReason: null,
      });
      expect(delivered.completedAt).not.toBeNull();
    },
  );

  webhookTest(
    "sends the review with build.reviewed",
    async ({ build, endpoint, createWebhook }) => {
      const webhook = await createWebhook({ events: ["build.reviewed"] });
      const buildReview = await factory.BuildReview.create({
        buildId: build.id,
        state: "rejected",
      });
      await sendProjectEvent({ name: "build.reviewed", build, buildReview });
      const [delivery] = await getDeliveries(webhook);
      invariant(delivery, "delivery not created");

      await deliverWebhook(delivery);

      const [request] = endpoint.requests;
      invariant(request);
      expect(JSON.parse(request.body)).toMatchObject({
        type: "build.reviewed",
        data: {
          build: { id: build.id },
          review: { id: buildReview.id, state: "rejected" },
        },
      });
    },
  );

  webhookTest(
    "sends the deployment with deployment events",
    async ({ project, endpoint, createWebhook }) => {
      const webhook = await createWebhook({
        events: ["deployment.created", "deployment.ready"],
      });
      const deployment = await factory.Deployment.create({
        projectId: project.id,
        status: "ready",
      });
      await sendProjectEvent({ name: "deployment.ready", deployment });
      const [delivery] = await getDeliveries(webhook);
      invariant(delivery, "delivery not created");

      await deliverWebhook(delivery);

      const [request] = endpoint.requests;
      invariant(request);
      expect(JSON.parse(request.body)).toMatchObject({
        type: "deployment.ready",
        data: {
          project: { id: project.id },
          deployment: {
            id: deployment.id,
            status: "ready",
            url: deployment.url,
          },
        },
      });
    },
  );

  webhookTest(
    "retries a failing endpoint, then records the failure",
    async ({ build, endpoint, createWebhook }) => {
      endpoint.status = 500;
      const webhook = await createWebhook({});
      await sendProjectEvent({ name: "build.completed", build });
      const [delivery] = await getDeliveries(webhook);
      invariant(delivery, "delivery not created");

      // Throwing hands the delivery back to the job queue, which runs it
      // again after a delay.
      await expect(deliverWebhook(delivery)).rejects.toThrow(
        "Your endpoint responded with HTTP 500.",
      );
      expect(await delivery.$query()).toMatchObject({
        attempts: 1,
        conclusion: null,
        responseStatus: 500,
      });

      await delivery.$query().patch({ attempts: 3 });
      await deliverWebhook(await delivery.$query());

      const failed = await delivery.$query();
      expect(failed).toMatchObject({
        attempts: 4,
        conclusion: "failed",
        responseStatus: 500,
        failureReason: "Your endpoint responded with HTTP 500.",
      });
      expect(failed.completedAt).not.toBeNull();
      expect(endpoint.requests).toHaveLength(2);
      // Every attempt carries the same message id, signed anew.
      const [first, second] = endpoint.requests;
      invariant(first && second);
      expect(second.headers["webhook-id"]).toBe(first.headers["webhook-id"]);
      expect(verifySignature(second, webhook.secret)).toBe(true);
    },
  );
});
