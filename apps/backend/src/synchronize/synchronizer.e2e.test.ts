import { beforeEach, describe, expect, it } from "vitest";

import { transaction } from "@/database";
import { GithubRepositoryInstallation, Project } from "@/database/models";
import { factory, setupDatabase } from "@/database/testing";

import { linkInstallationRepositories } from "./synchronizer";

async function linkedInstallationIds(githubRepositoryId: string) {
  const links = await GithubRepositoryInstallation.query().where({
    githubRepositoryId,
  });
  return links.map((link) => link.githubInstallationId).sort();
}

describe("linkInstallationRepositories", () => {
  beforeEach(async () => {
    await setupDatabase();
  });

  it("evicts a stale link held by another active installation of the same app", async () => {
    const repository = await factory.GithubRepository.create();
    const [oldInstallation, newInstallation] = await Promise.all([
      factory.GithubInstallation.create({ app: "main" }),
      factory.GithubInstallation.create({ app: "main" }),
    ]);
    await factory.GithubRepositoryInstallation.create({
      githubRepositoryId: repository.id,
      githubInstallationId: oldInstallation.id,
    });

    // The new installation lists the repository through the GitHub API, so it
    // becomes authoritative and the stale link is evicted.
    await transaction((trx) =>
      linkInstallationRepositories(newInstallation, [repository], trx),
    );

    expect(await linkedInstallationIds(repository.id)).toEqual([
      newInstallation.id,
    ]);
  });

  it("does not evict a link held by an installation of a different app", async () => {
    const repository = await factory.GithubRepository.create();
    const [lightInstallation, mainInstallation] = await Promise.all([
      factory.GithubInstallation.create({ app: "light" }),
      factory.GithubInstallation.create({ app: "main" }),
    ]);
    await factory.GithubRepositoryInstallation.create({
      githubRepositoryId: repository.id,
      githubInstallationId: lightInstallation.id,
    });

    await transaction((trx) =>
      linkInstallationRepositories(mainInstallation, [repository], trx),
    );

    // The light installation keeps serving the repository alongside the main one.
    expect(await linkedInstallationIds(repository.id)).toEqual(
      [lightInstallation.id, mainInstallation.id].sort(),
    );
  });

  it("keeps the project linked when the repository is still served by another active installation", async () => {
    const repository = await factory.GithubRepository.create();
    const [installationA, installationB] = await Promise.all([
      factory.GithubInstallation.create({ app: "main" }),
      factory.GithubInstallation.create({ app: "main" }),
    ]);
    await Promise.all([
      factory.GithubRepositoryInstallation.create({
        githubRepositoryId: repository.id,
        githubInstallationId: installationA.id,
      }),
      factory.GithubRepositoryInstallation.create({
        githubRepositoryId: repository.id,
        githubInstallationId: installationB.id,
      }),
    ]);
    const project = await factory.Project.create({
      githubRepositoryId: repository.id,
    });

    // Installation A loses access to the repository, but installation B still
    // serves it: the project must stay linked.
    await transaction((trx) =>
      linkInstallationRepositories(installationA, [], trx),
    );

    const reloaded = await Project.query().findById(project.id);
    expect(reloaded?.githubRepositoryId).toBe(repository.id);
    expect(await linkedInstallationIds(repository.id)).toEqual([
      installationB.id,
    ]);
  });

  it("detaches the project when the repository has no remaining active installation", async () => {
    const repository = await factory.GithubRepository.create();
    const installation = await factory.GithubInstallation.create({
      app: "main",
    });
    await factory.GithubRepositoryInstallation.create({
      githubRepositoryId: repository.id,
      githubInstallationId: installation.id,
    });
    const project = await factory.Project.create({
      githubRepositoryId: repository.id,
    });

    await transaction((trx) =>
      linkInstallationRepositories(installation, [], trx),
    );

    const reloaded = await Project.query().findById(project.id);
    expect(reloaded?.githubRepositoryId).toBeNull();
    expect(await linkedInstallationIds(repository.id)).toEqual([]);
  });
});
