import { invariant } from "@argos/util/invariant";
import { beforeEach, describe, expect, it } from "vitest";

import { getAuthProjectPayloadFromBearerToken } from "@/auth/project";
import { Project, ProjectToken } from "@/database/models";
import { factory, setupDatabase } from "@/database/testing";

import { transferProject } from "./project";
import { deleteProjectToken, getProjectTokenProjects } from "./project-token";

/**
 * A user administering a personal account and a team, with two projects on the
 * personal account.
 */
async function createOwner() {
  const userAccount = await factory.UserAccount.create();
  await userAccount.$fetchGraph("user");
  invariant(userAccount.user, "user not fetched");
  invariant(userAccount.userId, "user account has no user");
  const teamAccount = await factory.TeamAccount.create();
  invariant(teamAccount.teamId, "team account has no team");
  await factory.TeamUser.create({
    teamId: teamAccount.teamId,
    userId: userAccount.userId,
    userLevel: "owner",
  });
  const [web, docs] = await Promise.all([
    factory.Project.create({ accountId: userAccount.id, name: "web" }),
    factory.Project.create({ accountId: userAccount.id, name: "docs" }),
  ]);
  invariant(web && docs);
  return { user: userAccount.user, teamAccount, web, docs };
}

describe("project tokens", () => {
  beforeEach(async () => {
    await setupDatabase();
  });

  describe("legacy tokens", () => {
    it("moves a token left in `projects.token` on its first use", async () => {
      const { web } = await createOwner();
      await Project.query().findById(web.id).patch({ token: "argos_legacy" });

      const auth = await getAuthProjectPayloadFromBearerToken("argos_legacy");
      expect(auth.projects.map((project) => project.id)).toEqual([web.id]);
      expect(auth.tokenId).not.toBeNull();

      const project = await Project.query().findById(web.id);
      expect(project?.token).toBeNull();
      const tokens = await ProjectToken.query();
      expect(tokens.map((token) => token.name)).toEqual(["Legacy token"]);

      // Now found in `project_tokens` directly.
      const again = await getAuthProjectPayloadFromBearerToken("argos_legacy");
      expect(again.tokenId).toBe(auth.tokenId);
    });

    it("keeps a revoked token revoked while `projects.token` still holds it", async () => {
      const { user, web } = await createOwner();
      // What the migration leaves: the token copied, the column untouched.
      await Project.query().findById(web.id).patch({ token: "argos_legacy" });
      const { projectToken } = await factory.createProjectToken({
        projects: [web],
        token: "argos_legacy",
      });

      await deleteProjectToken({ projectToken, user });

      await expect(
        getAuthProjectPayloadFromBearerToken("argos_legacy"),
      ).rejects.toThrow(/Project not found/);
      const project = await Project.query().findById(web.id);
      expect(project?.token).toBeNull();
    });
  });

  it("records when a token was last used", async () => {
    const { web } = await createOwner();
    const { projectToken, token } = await factory.createProjectToken({
      projects: [web],
    });
    expect(projectToken.lastUsedAt).toBeNull();
    await getAuthProjectPayloadFromBearerToken(token);
    const used = await ProjectToken.query().findById(projectToken.id);
    expect(used?.lastUsedAt).not.toBeNull();
  });

  it("rejects a token whose projects are all deleted", async () => {
    const { web } = await createOwner();
    const { token } = await factory.createProjectToken({ projects: [web] });
    await Project.query()
      .findById(web.id)
      .patch({ deletedAt: new Date().toISOString() });
    await expect(getAuthProjectPayloadFromBearerToken(token)).rejects.toThrow(
      /not linked to any project/,
    );
  });

  it("follows a transferred project with the tokens linked only to it", async () => {
    const { user, teamAccount, web, docs } = await createOwner();
    const own = await factory.createProjectToken({ projects: [web] });
    const shared = await factory.createProjectToken({ projects: [web, docs] });

    await transferProject({
      project: web,
      user,
      targetAccount: teamAccount,
      name: "web",
    });

    // CI keeps uploading to the transferred project with its own token.
    const ownAuth = await getAuthProjectPayloadFromBearerToken(own.token);
    expect(ownAuth.projects.map((project) => project.id)).toEqual([web.id]);
    const moved = await ProjectToken.query().findById(own.projectToken.id);
    expect(moved?.accountId).toBe(teamAccount.id);

    // A token of the former account keeps its other projects only.
    const sharedAuth = await getAuthProjectPayloadFromBearerToken(shared.token);
    expect(sharedAuth.projects.map((project) => project.id)).toEqual([docs.id]);
    const sharedProjects = await getProjectTokenProjects(shared.projectToken);
    expect(sharedProjects.map((project) => project.id)).toEqual([docs.id]);
  });
});
