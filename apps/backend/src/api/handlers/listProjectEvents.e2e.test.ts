import type { ProjectEventName } from "@argos/schemas/project-event";
import { invariant } from "@argos/util/invariant";
import request from "supertest";
import { test as base, describe, expect } from "vitest";

import {
  UserAccessTokenScope,
  type Account,
  type Project,
  type ProjectEvent,
} from "@/database/models";
import { hashToken } from "@/database/services/crypto";
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
      factory.ProjectEvent.create({
        projectId: (input.project ?? project).id,
        name: input.name ?? "build.completed",
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

function eventIds(res: request.Response): string[] {
  return res.body.events.map((event: { id: string }) => event.id);
}

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

    const event = await addEvent({ secondsAgo: 0 });
    const otherProject = await factory.Project.create({
      accountId: account.id,
      name: "other",
    });
    await addEvent({ project: otherProject, secondsAgo: 0 });

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

    const later = await addEvent({ secondsAgo: 0 });
    expect(eventIds(await read({ cursor: next.body.cursor }))).toEqual([
      later.id,
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
    const builds = events
      .filter((event) => event.name === "build.completed")
      .map((event) => event.id);

    const first = await read({
      cursor: start.body.cursor,
      name: "build.completed",
      limit: "2",
    });
    expect(eventIds(first)).toEqual(builds.slice(0, 2));
    expect(first.body.hasMore).toBe(true);

    const second = await read({
      cursor: first.body.cursor,
      name: "build.completed",
      limit: "2",
    });
    expect(eventIds(second)).toEqual(builds.slice(2));
    expect(second.body.hasMore).toBe(false);
  });

  test("replays the last events with maxAgeMs", async ({ addEvent, read }) => {
    await addEvent({ secondsAgo: 120 });
    const recent = await addEvent({ secondsAgo: 30 });

    expect(eventIds(await read({ maxAgeMs: "60000" }))).toEqual([recent.id]);
    expect(
      eventIds(await read({ maxAgeMs: String(Number.MAX_SAFE_INTEGER) })),
    ).toHaveLength(2);
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

  test("hides who reviewed from project tokens", async ({
    account,
    project,
    read,
  }) => {
    const start = await read({});
    const reviewer = { id: "7", slug: "ada", name: "Ada" };
    await factory.ProjectEvent.create({
      projectId: project.id,
      name: "build.reviewed",
      data: {
        build: { id: "1" },
        review: { id: "1", user: reviewer, dismissedBy: reviewer },
      },
    });

    const withProjectToken = await read({ cursor: start.body.cursor });
    expect(withProjectToken.body.events[0].data.review).toEqual({
      id: "1",
      user: null,
      dismissedBy: null,
    });

    const owner = await factory.User.create();
    await factory.UserAccount.create({ userId: owner.id });
    invariant(account.teamId);
    await factory.TeamUser.create({
      teamId: account.teamId,
      userId: owner.id,
      userLevel: "owner",
    });
    const pat = `arp_${"e".repeat(36)}`;
    const userAccessToken = await factory.UserAccessToken.create({
      userId: owner.id,
      token: hashToken(pat),
    });
    await UserAccessTokenScope.query().insert({
      userAccessTokenId: userAccessToken.id,
      accountId: account.id,
    });
    const withPat = await request(app)
      .get("/projects/acme/web/events")
      .query({ cursor: start.body.cursor })
      .set("Authorization", `Bearer ${pat}`);
    expect(withPat.status).toBe(200);
    expect(withPat.body.events[0].data.review).toEqual({
      id: "1",
      user: reviewer,
      dismissedBy: reviewer,
    });
  });

  test("rejects a cursor it did not give", async ({ read }) => {
    const res = await read({ cursor: "not-a-cursor" });
    expect(res.status).toBe(400);
  });
});
