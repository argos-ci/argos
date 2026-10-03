import { invariant } from "@argos/util/invariant";
import { beforeEach, describe, expect, it } from "vitest";

import { Account, Project, Team } from "@/database/models";
import { factory, setupDatabase } from "@/database/testing";

import { checkInstallationUsesProxy } from "./static-ip";

async function createTeamAccount(input: { staticIpEnabled: boolean }) {
  const teamAccount = await factory.TeamAccount.create();
  invariant(teamAccount.teamId, "team account has no team");
  await Team.query()
    .findById(teamAccount.teamId)
    .patch({ staticIpEnabled: input.staticIpEnabled });
  return teamAccount;
}

/** An installation reaching a repository that a project of `account` uses. */
async function createProjectInstallation(account: Account) {
  const installation = await factory.GithubInstallation.create();
  const repoInstallation = await factory.GithubRepositoryInstallation.create({
    githubInstallationId: installation.id,
  });
  const project = await factory.Project.create({
    accountId: account.id,
    githubRepositoryId: repoInstallation.githubRepositoryId,
  });
  return { installation, project };
}

describe("checkInstallationUsesProxy", () => {
  beforeEach(async () => {
    await setupDatabase();
  });

  it("routes an installation used by a team with Static IP", async () => {
    const teamAccount = await createTeamAccount({ staticIpEnabled: true });
    const { installation } = await createProjectInstallation(teamAccount);
    expect(await checkInstallationUsesProxy(installation)).toBe(true);
  });

  it("does not route an installation used only by teams without Static IP", async () => {
    const teamAccount = await createTeamAccount({ staticIpEnabled: false });
    const { installation } = await createProjectInstallation(teamAccount);
    const otherTeamAccount = await createTeamAccount({ staticIpEnabled: true });
    await createProjectInstallation(otherTeamAccount);
    expect(await checkInstallationUsesProxy(installation)).toBe(false);
  });

  it("stops routing once the team's project is deleted", async () => {
    const teamAccount = await createTeamAccount({ staticIpEnabled: true });
    const { installation, project } =
      await createProjectInstallation(teamAccount);
    await Project.query()
      .findById(project.id)
      .patch({ deletedAt: new Date().toISOString() });
    expect(await checkInstallationUsesProxy(installation)).toBe(false);
  });

  it("routes the light installation of a team with Static IP", async () => {
    const teamAccount = await createTeamAccount({ staticIpEnabled: true });
    const installation = await factory.GithubInstallation.create({
      app: "light",
    });
    await Account.query()
      .findById(teamAccount.id)
      .patch({ githubLightInstallationId: installation.id });
    expect(await checkInstallationUsesProxy(installation)).toBe(true);
  });

  it("routes an installation set to use the proxy by hand", async () => {
    const installation = await factory.GithubInstallation.create({
      proxy: true,
    });
    expect(await checkInstallationUsesProxy(installation)).toBe(true);
  });
});
