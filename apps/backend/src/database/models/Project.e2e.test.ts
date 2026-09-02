import { invariant } from "@argos/util/invariant";
import { beforeEach, describe, expect, it } from "vitest";

import { Project } from "@/database/models";
import { factory, setupDatabase } from "@/database/testing";

/**
 * `Project.getPermissions` is where a deleted project is refused for the whole
 * application. Every surface that reaches a project through one of its own rows
 * — a build, a test, a media, an automation rule — authorizes here rather than
 * through a project lookup, so nothing else can close them all.
 */
describe("Project permissions on a deleted project", () => {
  beforeEach(async () => {
    await setupDatabase();
  });

  async function seed(attrs?: { private?: boolean | null }) {
    const user = await factory.User.create();
    const account = await factory.TeamAccount.create();
    invariant(account.teamId, "team account has no team");
    await factory.TeamUser.create({
      teamId: account.teamId,
      userId: user.id,
      userLevel: "owner",
    });
    const project = await factory.Project.create({
      accountId: account.id,
      private: attrs?.private ?? true,
    });
    return { user, account, project };
  }

  async function markDeleted(project: Project) {
    await project.$query().patch({
      name: `deleted-${project.id}-${project.name}`,
      deletedAt: new Date().toISOString(),
    });
    const reloaded = await Project.query().findById(project.id);
    invariant(reloaded, "project row must survive the delete");
    return reloaded;
  }

  it("grants an owner nothing", async () => {
    const { user, project } = await seed();
    await expect(project.$getPermissions(user)).resolves.toContain("admin");

    const deleted = await markDeleted(project);

    await expect(deleted.$getPermissions(user)).resolves.toEqual([]);
    await expect(deleted.$getMembershipPermissions(user)).resolves.toEqual([]);
  });

  it("grants staff nothing", async () => {
    // Staff otherwise hold every permission on every project, so they are the
    // case a guard placed after the staff short-circuit would miss.
    const { project } = await seed();
    const staff = await factory.User.create({ staff: true });
    await expect(project.$getPermissions(staff)).resolves.toContain("admin");

    const deleted = await markDeleted(project);

    await expect(deleted.$getPermissions(staff)).resolves.toEqual([]);
    await expect(deleted.$getMembershipPermissions(staff)).resolves.toEqual([]);
  });

  it("grants an anonymous visitor nothing on what was a public project", async () => {
    // The path that does not go through membership at all: a public project
    // grants "view" to anyone, so it needs its own guard.
    const { project } = await seed({ private: false });
    await expect(project.$getPermissions(null)).resolves.toEqual(["view"]);

    const deleted = await markDeleted(project);

    await expect(deleted.$getPermissions(null)).resolves.toEqual([]);
  });

  it("still grants permissions on a live project of the same account", async () => {
    const { user, account, project } = await seed();
    const sibling = await factory.Project.create({
      name: "sibling",
      accountId: account.id,
    });

    await markDeleted(project);

    await expect(sibling.$getPermissions(user)).resolves.toContain("admin");
  });
});
