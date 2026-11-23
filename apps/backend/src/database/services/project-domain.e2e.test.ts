import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { DeploymentAlias, ProjectDomain } from "@/database/models";
import { factory, setupDatabase } from "@/database/testing";

import {
  ensureProductionInternalProjectDomain,
  getProductionInternalProjectDomain,
  upsertProductionInternalProjectDomain,
} from "./project-domain";

/**
 * Another project serving on the labels `web-feature-acme` (a branch alias)
 * and `web-k3j2h1g9f-acme` (a deployment slug).
 */
async function createHostnameHolder() {
  const project = await factory.Project.create();
  const deployment = await factory.Deployment.create({
    projectId: project.id,
    environment: "preview",
    status: "ready",
    slug: "web-k3j2h1g9f-acme",
  });
  await factory.DeploymentAlias.create({
    deploymentId: deployment.id,
    alias: "web-feature-acme",
    type: "branch",
  });
}

describe("project-domain service", () => {
  beforeEach(async () => {
    await setupDatabase();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("getProductionInternalProjectDomain", () => {
    it("returns the internal production domain for a project", async () => {
      const project = await factory.Project.create();
      await factory.ProjectDomain.create({
        projectId: project.id,
        domain: "docs.dev.argos-ci.live",
        environment: "production",
        internal: true,
      });
      await factory.ProjectDomain.create({
        projectId: project.id,
        domain: "preview.dev.argos-ci.live",
        environment: "preview",
        branch: "main",
        internal: true,
      });

      const domain = await getProductionInternalProjectDomain(project.id);

      expect(domain).toMatchObject({
        projectId: project.id,
        domain: "docs.dev.argos-ci.live",
        environment: "production",
        internal: true,
      });
    });

    it("returns null when no internal production domain exists", async () => {
      const project = await factory.Project.create();

      const domain = await getProductionInternalProjectDomain(project.id);

      expect(domain).toBeNull();
    });
  });

  describe("ensureProductionInternalProjectDomain", () => {
    it("returns the existing internal production domain", async () => {
      const project = await factory.Project.create({ name: "docs" });
      const existingDomain = await factory.ProjectDomain.create({
        projectId: project.id,
        domain: "docs.dev.argos-ci.live",
        environment: "production",
        internal: true,
      });

      const domain = await ensureProductionInternalProjectDomain({
        projectId: project.id,
        projectName: project.name,
      });

      expect(domain.id).toBe(existingDomain.id);
      await expect(
        ProjectDomain.query().where("projectId", project.id),
      ).resolves.toHaveLength(1);
    });

    it("creates a unique internal production domain based on the project name", async () => {
      await factory.ProjectDomain.create({
        domain: "docs.dev.argos-ci.live",
        environment: "production",
        internal: true,
      });
      const project = await factory.Project.create({ name: "docs" });

      const domain = await ensureProductionInternalProjectDomain({
        projectId: project.id,
        projectName: project.name,
      });

      expect(domain).toMatchObject({
        projectId: project.id,
        domain: "docs-1.dev.argos-ci.live",
        environment: "production",
        internal: true,
      });
    });

    it.each([
      ["dev", "dev-1.dev.argos-ci.live"],
      // The custom-domain CNAME target. A specific record in the zone, so a
      // project holding this slug would be shadowed by it.
      ["cname", "cname-1.dev.argos-ci.live"],
    ])(
      "protects the reserved %s internal domain slug",
      async (name, expected) => {
        const project = await factory.Project.create({ name });

        const domain = await ensureProductionInternalProjectDomain({
          projectId: project.id,
          projectName: project.name,
        });

        expect(domain).toMatchObject({
          projectId: project.id,
          domain: expected,
          environment: "production",
          internal: true,
        });
      },
    );

    it("suffixes a name another project's branch alias holds", async () => {
      await createHostnameHolder();
      const project = await factory.Project.create({
        name: "web-feature-acme",
      });

      const domain = await ensureProductionInternalProjectDomain({
        projectId: project.id,
        projectName: project.name,
      });

      expect(domain.domain).toBe("web-feature-acme-1.dev.argos-ci.live");
    });

    it("retries with a new suffix after a concurrent unique-constraint failure", async () => {
      const project = await factory.Project.create({ name: "docs" });
      const otherProject = await factory.Project.create({ name: "other-docs" });
      const originalInsertAndFetch = (
        ProjectDomain.QueryBuilder.prototype as any
      ).insertAndFetch;
      const insertAndFetch = vi.spyOn(
        ProjectDomain.QueryBuilder.prototype as any,
        "insertAndFetch",
      );

      insertAndFetch
        .mockRejectedValueOnce({
          nativeError: {
            code: "23505",
          },
        })
        .mockImplementationOnce(async function (...args: unknown[]) {
          const [insert] = args as [
            {
              domain: string;
              environment: "production";
              branch: null;
              projectId: string;
              internal: boolean;
            },
          ];

          await originalInsertAndFetch.call(ProjectDomain.query(), {
            ...insert,
            domain: "docs.dev.argos-ci.live",
            projectId: otherProject.id,
          });

          return originalInsertAndFetch.call(ProjectDomain.query(), insert);
        });

      const domain = await ensureProductionInternalProjectDomain({
        projectId: project.id,
        projectName: project.name,
      });

      expect(domain).toMatchObject({
        projectId: project.id,
        domain: "docs-1.dev.argos-ci.live",
        environment: "production",
        internal: true,
      });
    });
  });

  describe("upsertProductionInternalProjectDomain", () => {
    it("creates the internal production domain when missing", async () => {
      const project = await factory.Project.create();

      const result = await upsertProductionInternalProjectDomain({
        projectId: project.id,
        domain: "marketing.dev.argos-ci.live",
      });

      expect(result).toMatchObject({
        previousAlias: null,
        nextAlias: null,
      });
      expect(result.projectDomain).toMatchObject({
        projectId: project.id,
        domain: "marketing.dev.argos-ci.live",
        environment: "production",
        internal: true,
      });
    });

    it.each(["web-feature-acme", "web-k3j2h1g9f-acme"])(
      "refuses %s, a hostname another project serves on",
      async (label) => {
        await createHostnameHolder();
        const project = await factory.Project.create();

        await expect(
          upsertProductionInternalProjectDomain({
            projectId: project.id,
            domain: `${label}.dev.argos-ci.live`,
          }),
        ).rejects.toMatchObject({ code: "PROJECT_DOMAIN_INTERNAL_SLUG" });
        await expect(
          ProjectDomain.query().where("projectId", project.id),
        ).resolves.toEqual([]);
      },
    );

    it("updates the domain alias for the latest ready production deployment", async () => {
      const project = await factory.Project.create();
      await factory.ProjectDomain.create({
        projectId: project.id,
        domain: "docs.dev.argos-ci.live",
        environment: "production",
        internal: true,
      });
      await factory.Deployment.create({
        projectId: project.id,
        environment: "production",
        status: "ready",
        createdAt: "2026-04-18T08:00:00.000Z",
      });
      const latestDeployment = await factory.Deployment.create({
        projectId: project.id,
        environment: "production",
        status: "ready",
        createdAt: "2026-04-18T09:00:00.000Z",
      });
      await factory.DeploymentAlias.create({
        alias: "docs.dev.argos-ci.live",
        deploymentId: latestDeployment.id,
      });

      const result = await upsertProductionInternalProjectDomain({
        projectId: project.id,
        domain: "marketing.dev.argos-ci.live",
      });

      expect(result).toMatchObject({
        previousAlias: "docs.dev.argos-ci.live",
        nextAlias: "marketing.dev.argos-ci.live",
      });
      await expect(
        DeploymentAlias.query().findOne({
          deploymentId: latestDeployment.id,
          alias: "marketing.dev.argos-ci.live",
        }),
      ).resolves.toBeTruthy();
    });
  });
});
