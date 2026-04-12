import {
  CloudFrontClient,
  CreateInvalidationCommand,
} from "@aws-sdk/client-cloudfront";

import config from "@/config";

const cf = new CloudFrontClient({ region: "us-east-1" });

/**
 * Invalidate the CloudFront cache for a specific deployment alias.
 *
 * The viewer-request Lambda prefixes every URI with the subdomain
 * (e.g. "/test/index.html"), so cache entries are scoped by path.
 * This allows targeted invalidation with "/{alias}/*" without affecting
 * other deployments.
 *
 * No-ops when the distribution ID is not configured (e.g. local dev).
 */
export async function invalidateDeploymentCache(alias: string): Promise<void> {
  const distributionId = config.get("deployments.cloudfrontDistributionId");
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
