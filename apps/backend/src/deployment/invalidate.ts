import {
  CloudFrontClient,
  CreateInvalidationCommand,
} from "@aws-sdk/client-cloudfront";

import config from "@/config";

const cf = new CloudFrontClient({ region: "us-east-1" });

/**
 * Invalidate the alias CDN cache for a specific alias.
 *
 * The alias distribution caches responses keyed on "/<alias>/<path>".
 * When an alias points to a new deployment, invalidating "/<alias>/*"
 * clears only that alias's entries. The deployment CDN is immutable
 * and is never invalidated.
 *
 * No-ops when the distribution ID is not configured (e.g. local dev).
 */
export async function invalidateDeploymentCache(alias: string): Promise<void> {
  const distributionId = config.get("deployments.distributionId");
  if (!distributionId) {
    return;
  }

  await cf.send(
    new CreateInvalidationCommand({
      DistributionId: distributionId,
      InvalidationBatch: {
        CallerReference: Date.now().toString(),
        Paths: {
          Quantity: 1,
          Items: [`/${alias}/*`],
        },
      },
    }),
  );
}
