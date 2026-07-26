import { invariant } from "@argos/util/invariant";
import { beforeEach, describe, expect, it } from "vitest";

import { knex } from "@/database";
import { ScreenshotDiff } from "@/database/models";
import { factory, setupDatabase } from "@/database/testing";

import { createLoaders } from "./loaders";

describe("ProjectTeamUserLevel loader", () => {
  beforeEach(async () => {
    await setupDatabase();
  });

  async function createTeamProjectWithMember(userLevel: "owner" | "member") {
    const account = await factory.TeamAccount.create();
    invariant(account.teamId);
    const project = await factory.Project.create({ accountId: account.id });
    const user = await factory.User.create();
    await factory.TeamUser.create({
      teamId: account.teamId,
      userId: user.id,
      userLevel,
    });
    return { account, project, user };
  }

  it("resolves the role for a team member", async () => {
    const { account, project, user } =
      await createTeamProjectWithMember("member");
    const loaders = createLoaders();
    const level = await loaders.ProjectTeamUserLevel.load({
      accountSlug: account.slug,
      projectName: project.name,
      userId: user.id,
    });
    expect(level).toBe("member");
  });

  it("returns null for a user that is not a team member", async () => {
    const { account, project } = await createTeamProjectWithMember("member");
    const outsider = await factory.User.create();
    const loaders = createLoaders();
    const level = await loaders.ProjectTeamUserLevel.load({
      accountSlug: account.slug,
      projectName: project.name,
      userId: outsider.id,
    });
    expect(level).toBeNull();
  });

  it("returns null when the project does not exist", async () => {
    const { account, user } = await createTeamProjectWithMember("member");
    const loaders = createLoaders();
    const level = await loaders.ProjectTeamUserLevel.load({
      accountSlug: account.slug,
      projectName: "does-not-exist",
      userId: user.id,
    });
    expect(level).toBeNull();
  });

  it("resolves a batch spanning multiple distinct projects correctly", async () => {
    const a = await createTeamProjectWithMember("owner");
    const b = await createTeamProjectWithMember("member");
    const loaders = createLoaders();
    // Loaded in the same tick so the DataLoader batches them together — the
    // composite (accountId, name) lookup must keep each project's team separate.
    const [levelA, levelB, crossed] = await Promise.all([
      loaders.ProjectTeamUserLevel.load({
        accountSlug: a.account.slug,
        projectName: a.project.name,
        userId: a.user.id,
      }),
      loaders.ProjectTeamUserLevel.load({
        accountSlug: b.account.slug,
        projectName: b.project.name,
        userId: b.user.id,
      }),
      // A's user against B's project must not resolve.
      loaders.ProjectTeamUserLevel.load({
        accountSlug: b.account.slug,
        projectName: b.project.name,
        userId: a.user.id,
      }),
    ]);
    expect(levelA).toBe("owner");
    expect(levelB).toBe("member");
    expect(crossed).toBeNull();
  });
});

describe("LatestChangeDiff loader", () => {
  beforeEach(async () => {
    await setupDatabase();
  });

  async function createDiff(input: {
    testId: string;
    fingerprint: string | null;
    fileId: string | null;
  }) {
    const diff = await factory.ScreenshotDiff.create();
    await ScreenshotDiff.query().findById(diff.id).patch(input);
    return diff;
  }

  it("returns the newest diff carrying the fingerprint", async () => {
    const test = await factory.Test.create();
    const file = await factory.File.create({ type: "screenshotDiff" });
    await createDiff({
      testId: test.id,
      fingerprint: "fp-1",
      fileId: file.id,
    });
    const newest = await createDiff({
      testId: test.id,
      fingerprint: "fp-1",
      fileId: file.id,
    });

    const loaders = createLoaders();
    const diff = await loaders.LatestChangeDiffLoader.load({
      testId: test.id,
      fingerprint: "fp-1",
    });

    expect(diff?.id).toBe(newest.id);
  });

  it("ignores diffs whose image is gone and returns null when none is left", async () => {
    const test = await factory.Test.create();
    await createDiff({ testId: test.id, fingerprint: "fp-1", fileId: null });

    const loaders = createLoaders();
    const diff = await loaders.LatestChangeDiffLoader.load({
      testId: test.id,
      fingerprint: "fp-1",
    });

    expect(diff).toBeNull();
  });

  it("keeps each key separate when the batch mixes tests and fingerprints", async () => {
    const [testA, testB] = await Promise.all([
      factory.Test.create(),
      factory.Test.create(),
    ]);
    const file = await factory.File.create({ type: "screenshotDiff" });
    const [diffA1, diffA2, diffB] = await Promise.all([
      createDiff({ testId: testA.id, fingerprint: "fp-1", fileId: file.id }),
      createDiff({ testId: testA.id, fingerprint: "fp-2", fileId: file.id }),
      createDiff({ testId: testB.id, fingerprint: "fp-1", fileId: file.id }),
    ]);

    const loaders = createLoaders();
    // Loaded in one tick so the DataLoader batches them into a single query.
    const [a1, a2, b, missing] = await Promise.all([
      loaders.LatestChangeDiffLoader.load({
        testId: testA.id,
        fingerprint: "fp-1",
      }),
      loaders.LatestChangeDiffLoader.load({
        testId: testA.id,
        fingerprint: "fp-2",
      }),
      loaders.LatestChangeDiffLoader.load({
        testId: testB.id,
        fingerprint: "fp-1",
      }),
      loaders.LatestChangeDiffLoader.load({
        testId: testB.id,
        fingerprint: "fp-3",
      }),
    ]);

    expect(a1?.id).toBe(diffA1.id);
    expect(a2?.id).toBe(diffA2.id);
    expect(b?.id).toBe(diffB.id);
    expect(missing).toBeNull();
  });
});

describe("ChangeOccurrencesSince loader", () => {
  beforeEach(async () => {
    await setupDatabase();
  });

  async function insertStats(
    rows: {
      testId: string;
      fingerprint: string;
      date: string;
      value: number;
    }[],
  ) {
    await knex("test_stats_fingerprints").insert(rows);
  }

  it("only counts occurrences at or after `from`", async () => {
    const test = await factory.Test.create();
    await insertStats([
      {
        testId: test.id,
        fingerprint: "fp-1",
        date: "2026-01-01T00:00:00.000Z",
        value: 5,
      },
      {
        testId: test.id,
        fingerprint: "fp-1",
        date: "2026-02-01T00:00:00.000Z",
        value: 3,
      },
      {
        testId: test.id,
        fingerprint: "fp-1",
        date: "2026-03-01T00:00:00.000Z",
        value: 2,
      },
    ]);

    const loaders = createLoaders();
    const total = await loaders.ChangeOccurrencesSinceLoader.load({
      testId: test.id,
      fingerprint: "fp-1",
      from: new Date("2026-02-01T00:00:00.000Z"),
    });

    expect(total).toBe(5);
  });

  it("returns 0 when nothing occurred since `from`", async () => {
    const test = await factory.Test.create();
    await insertStats([
      {
        testId: test.id,
        fingerprint: "fp-1",
        date: "2026-01-01T00:00:00.000Z",
        value: 4,
      },
    ]);

    const loaders = createLoaders();
    const total = await loaders.ChangeOccurrencesSinceLoader.load({
      testId: test.id,
      fingerprint: "fp-1",
      from: new Date("2026-02-01T00:00:00.000Z"),
    });

    expect(total).toBe(0);
  });

  it("applies each key's own `from` within a single batch", async () => {
    const test = await factory.Test.create();
    await insertStats([
      {
        testId: test.id,
        fingerprint: "fp-1",
        date: "2026-01-01T00:00:00.000Z",
        value: 7,
      },
      {
        testId: test.id,
        fingerprint: "fp-2",
        date: "2026-01-01T00:00:00.000Z",
        value: 9,
      },
    ]);

    const loaders = createLoaders();
    // Same test, same date, different `from` per key: the batched query must not
    // collapse them onto a single window.
    const [counted, excluded, allTime] = await Promise.all([
      loaders.ChangeOccurrencesSinceLoader.load({
        testId: test.id,
        fingerprint: "fp-1",
        from: new Date("2025-12-01T00:00:00.000Z"),
      }),
      loaders.ChangeOccurrencesSinceLoader.load({
        testId: test.id,
        fingerprint: "fp-2",
        from: new Date("2026-06-01T00:00:00.000Z"),
      }),
      loaders.ChangeOccurrencesSinceLoader.load({
        testId: test.id,
        fingerprint: "fp-2",
        from: new Date(0),
      }),
    ]);

    expect(counted).toBe(7);
    expect(excluded).toBe(0);
    expect(allTime).toBe(9);
  });
});
