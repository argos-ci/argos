import { afterEach, describe, expect, it, vi } from "vitest";

import config from "@/config";

import { invalidateDeploymentCache } from "./invalidate";

describe("invalidateDeploymentCache", () => {
  const fetchMock = vi.fn();
  const originalZoneId = config.get("deployments.cloudflare.zoneId");
  const originalApiToken = config.get("deployments.cloudflare.apiToken");

  afterEach(() => {
    vi.restoreAllMocks();
    fetchMock.mockReset();
    config.set("deployments.cloudflare.zoneId", originalZoneId);
    config.set("deployments.cloudflare.apiToken", originalApiToken);
  });

  it("purges both full-domain and slug resolution URLs for full domains", async () => {
    config.set("deployments.cloudflare.zoneId", "zone-id");
    config.set("deployments.cloudflare.apiToken", "api-token");
    vi.stubGlobal("fetch", fetchMock);
    fetchMock.mockResolvedValue({
      ok: true,
      json: async () => ({ success: true }),
    });

    await invalidateDeploymentCache("marketing.dev.argos-ci.live");

    expect(fetchMock).toHaveBeenCalledWith(
      "https://api.cloudflare.com/client/v4/zones/zone-id/purge_cache",
      expect.objectContaining({
        body: JSON.stringify({
          files: [
            "https://api.argos-ci.dev:4001/v2/deployments/resolve/marketing.dev.argos-ci.live",
            "https://api.argos-ci.dev:4001/v2/deployments/resolve/marketing",
          ],
        }),
      }),
    );
  });
});
