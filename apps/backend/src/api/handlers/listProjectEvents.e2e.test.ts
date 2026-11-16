import type { ProjectEventName } from "@argos/schemas/project-event";
import request from "supertest";
import { test as base, describe, expect } from "vitest";

import { ProjectEvent, type Account, type Project } from "@/database/models";
import { factory, setupDatabase } from "@/database/testing";

import { createTestHandlerApp } from "../test-util";
import { listProjectEventsHandler } from "./listProjectEvents";

const app = createTestHandlerApp(listProjectEventsHandler);

const TOKEN = "the-feed-token";

const test = base.extend<{
  account: Account;
  project: Project;
  /** Record an event that happened `secondsAgo` seconds ago. */
  addEvent: (input: {
    project?: Project;
    name?: ProjectEventName;
    secondsAgo: number;
  }) => Promise<ProjectEvent>;
  /** Read the project's events feed. */
  read: (query: Record<string, string>) => Promise<request.Response>;
}>({
  account: async ({}, use) => {
    await setupDatabase();
    await use(await factory.TeamAccount.create({ slug: "acme" }));
  },
  project: async ({ account }, use) => {
    const project = await factory.Project.create({
      accountId: account.id,
      name: "web",
    });
    await factory.createProjectToken({ projects: [project], token: TOKEN });
    await use(project);
  },
  addEvent: async ({ project }, use) => {
    await use(async (input) =>
      ProjectEvent.query().insertAndFetch({
        projectId: (input.project ?? project).id,
        name: input.name ?? "build.completed",
        data: { build: { id: "1" } },
        createdAt: new Date(Date.now() - input.secondsAgo * 1000).toISOString(),
      }),
    );
  },
  read: async ({}, use) => {
    await use((query) =>
      request(app)
        .get("/projects/acme/web/events")
        .query(query)
        .set("Authorization", `Bearer ${TOKEN}`),
    );
  },
});

describe("GET /projects/{owner}/{project}/events", () => {
  test("starts now, then returns what happens after the cursor", async ({
    account,
    addEvent,
    read,
  }) => {
    await addEvent({ secondsAgo: 60 });
    const start = await read({});
    expect(start.status).toBe(200);
    expect(start.body).toEqual({
      events: [],
      cursor: expect.any(String),
      truncated: false,
      hasMore: false,
    });

    const event = await addEvent({ secondsAgo: 10 });
    const otherProject = await factory.Project.create({
      accountId: account.id,
      name: "other",
    });
    await addEvent({ project: otherProject, secondsAgo: 10 });
    // Too recent to be read: an older id may still be committing.
    const recent = await addEvent({ secondsAgo: 0 });

    const next = await read({ cursor: start.body.cursor });
    expect(next.status).toBe(200);
    expect(next.body).toEqual({
      events: [
        {
          id: event.id,
          type: "build.completed",
          timestamp: new Date(event.createdAt).toISOString(),
          data: { build: { id: "1" } },
        },
      ],
      cursor: expect.any(String),
      truncated: false,
      hasMore: false,
    });

    await recent.$query().patch({
      createdAt: new Date(Date.now() - 5000).toISOString(),
    });
    const last = await read({ cursor: next.body.cursor });
    expect(last.body.events.map((e: { id: string }) => e.id)).toEqual([
      recent.id,
    ]);
  });

  test("filters by name and pages", async ({ addEvent, read }) => {
    const start = await read({});
    const events = [
      await addEvent({ secondsAgo: 30 }),
      await addEvent({ secondsAgo: 20, name: "deployment.ready" }),
      await addEvent({ secondsAgo: 20 }),
      await addEvent({ secondsAgo: 10 }),
    ];
    const builds = events.filter((event) => event.name === "build.completed");

    const first = await read({
      cursor: start.body.cursor,
      name: "build.completed",
      limit: "2",
    });
    expect(first.body.events.map((e: { id: string }) => e.id)).toEqual(
      builds.slice(0, 2).map((event) => event.id),
    );
    expect(first.body.hasMore).toBe(true);

    const second = await read({
      cursor: first.body.cursor,
      name: "build.completed",
      limit: "2",
    });
    expect(second.body.events.map((e: { id: string }) => e.id)).toEqual(
      builds.slice(2).map((event) => event.id),
    );
    expect(second.body.hasMore).toBe(false);
  });

  test("replays the last events with maxAgeMs", async ({ addEvent, read }) => {
    await addEvent({ secondsAgo: 120 });
    const recent = await addEvent({ secondsAgo: 30 });

    const res = await read({ maxAgeMs: "60000" });
    expect(res.body.events.map((e: { id: string }) => e.id)).toEqual([
      recent.id,
    ]);
  });

  test("flags the events purged before being read", async ({
    addEvent,
    read,
  }) => {
    const start = await read({});
    const purged = await addEvent({ secondsAgo: 30 });
    const kept = await addEvent({ secondsAgo: 30 });
    await purged.$query().delete();

    const res = await read({ cursor: start.body.cursor });
    expect(res.body).toMatchObject({
      events: [{ id: kept.id }],
      truncated: true,
    });
  });

  test("rejects a cursor it did not give", async ({ read }) => {
    const res = await read({ cursor: "not-a-cursor" });
    expect(res.status).toBe(400);
  });
});
