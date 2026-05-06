import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import config from "@/config";
import { factory, setupDatabase } from "@/database/testing";

import { invalidateProjectDeploymentCache } from "./invalidate";

describe("invalidateProjectDeploymentCache", () => {
  const fetchMock = vi.fn();
  const originalZoneId = config.get("deployments.cloudflare.zoneId");
  const originalApiToken = config.get("deployments.cloudflare.apiToken");

  beforeEach(async () => {
    await setupDatabase();
    config.set("deployments.cloudflare.zoneId", "zone-id");
    config.set("deployments.cloudflare.apiToken", "api-token");
    vi.stubGlobal("fetch", fetchMock);
    fetchMock.mockResolvedValue({
      ok: true,
      json: async () => ({ success: true }),
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
    fetchMock.mockReset();
    config.set("deployments.cloudflare.zoneId", originalZoneId);
    config.set("deployments.cloudflare.apiToken", originalApiToken);
  });

  it("purges the latest production domain alias for the project", async () => {
    const project = await factory.Project.create();
    const olderProductionDeployment = await factory.Deployment.create({
      projectId: project.id,
      environment: "production",
      createdAt: "2026-05-01T00:00:00.000Z",
    });
    const latestProductionDeployment = await factory.Deployment.create({
      projectId: project.id,
      environment: "production",
      createdAt: "2026-05-02T00:00:00.000Z",
    });
    const previewDeployment = await factory.Deployment.create({
      projectId: project.id,
      environment: "preview",
      createdAt: "2026-05-03T00:00:00.000Z",
    });

    await factory.DeploymentAlias.create({
      deploymentId: olderProductionDeployment.id,
      alias: "old-docs.dev.argos-ci.live",
      type: "domain",
    });
    await factory.DeploymentAlias.create({
      deploymentId: latestProductionDeployment.id,
      alias: "docs.dev.argos-ci.live",
      type: "domain",
    });
    await factory.DeploymentAlias.create({
      deploymentId: latestProductionDeployment.id,
      alias: "main",
      type: "branch",
    });
    await factory.DeploymentAlias.create({
      deploymentId: previewDeployment.id,
      alias: "preview.dev.argos-ci.live",
      type: "domain",
    });

    await invalidateProjectDeploymentCache(project.id);

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock).toHaveBeenCalledWith(
      "https://api.cloudflare.com/client/v4/zones/zone-id/purge_cache",
      expect.objectContaining({
        body: JSON.stringify({
          files: [
            "https://api.argos-ci.dev:4001/v2/deployments/resolve/docs.dev.argos-ci.live",
            "https://api.argos-ci.dev:4001/v2/deployments/resolve/docs",
          ],
        }),
      }),
    );
  });
});
