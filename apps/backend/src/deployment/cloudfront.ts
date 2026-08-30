import { invariant } from "@argos/util/invariant";
import {
  CloudFrontClient,
  CNAMEAlreadyExists,
  CreateDistributionTenantCommand,
  DeleteDistributionTenantCommand,
  EntityAlreadyExists,
  EntityLimitExceeded,
  EntityNotFound,
  GetConnectionGroupCommand,
  GetDistributionTenantCommand,
  InvalidArgument,
} from "@aws-sdk/client-cloudfront";
import { memoize } from "lodash-es";

import config from "@/config";

function getCloudFrontClientBase() {
  // CloudFront is a global service whose control plane lives in us-east-1.
  return new CloudFrontClient({ region: "us-east-1" });
}

const getCloudFrontClient: typeof getCloudFrontClientBase = memoize(
  getCloudFrontClientBase,
);

/**
 * Whether custom domains can be provisioned in this environment. Development
 * and self-hosted installs have no multi-tenant distribution, and the whole
 * feature degrades to "not offered" rather than failing at request time.
 */
export function checkIsCustomDomainsConfigured(): boolean {
  return Boolean(
    config.get("deployments.customDomains.distributionId") &&
    config.get("deployments.customDomains.connectionGroupId"),
  );
}

function getCustomDomainsConfig() {
  const distributionId = config.get("deployments.customDomains.distributionId");
  const connectionGroupId = config.get(
    "deployments.customDomains.connectionGroupId",
  );
  invariant(
    distributionId && connectionGroupId,
    "custom domains are not configured",
  );
  return { distributionId, connectionGroupId };
}

async function getRoutingEndpointBase(): Promise<string> {
  const { connectionGroupId } = getCustomDomainsConfig();
  const result = await getCloudFrontClient().send(
    new GetConnectionGroupCommand({ Identifier: connectionGroupId }),
  );
  const routingEndpoint = result.ConnectionGroup?.RoutingEndpoint;
  invariant(
    routingEndpoint,
    `connection group ${connectionGroupId} has no routing endpoint`,
  );
  return routingEndpoint;
}

/**
 * The hostname customers point their DNS record at. Read from the connection
 * group rather than configured, so it cannot drift from the distribution.
 */
const getRoutingEndpoint: typeof getRoutingEndpointBase = memoize(
  getRoutingEndpointBase,
);

/**
 * The tenant name CloudFront knows a domain by.
 *
 * Derived from the `project_domains` row rather than from the domain itself:
 * tenant names accept a narrower character set than hostnames do, and a
 * customer renaming a domain would otherwise strand the tenant under its old
 * name.
 */
function getTenantName(projectDomainId: string): string {
  return `argos-${projectDomainId}`;
}

export type DomainTenant = {
  tenantId: string;
  routingEndpoint: string;
  /** True once CloudFront has issued the certificate and serves the domain. */
  active: boolean;
};

/**
 * Create the CloudFront distribution tenant that serves a custom domain.
 *
 * One tenant per domain, never per project: CloudFront allows a single pending
 * certificate request per tenant, so a second domain added while the first is
 * still validating would be rejected.
 *
 * `ValidationTokenHost: "cloudfront"` is what makes the customer's side a single
 * DNS record — CloudFront answers the HTTP validation challenge itself as soon
 * as the domain resolves to it, instead of asking them for a TXT record.
 */
export async function createDomainTenant(input: {
  projectDomainId: string;
  domain: string;
}): Promise<DomainTenant> {
  const { distributionId, connectionGroupId } = getCustomDomainsConfig();
  const result = await getCloudFrontClient().send(
    new CreateDistributionTenantCommand({
      DistributionId: distributionId,
      ConnectionGroupId: connectionGroupId,
      Name: getTenantName(input.projectDomainId),
      Domains: [{ Domain: input.domain }],
      ManagedCertificateRequest: {
        ValidationTokenHost: "cloudfront",
        PrimaryDomainName: input.domain,
      },
      Enabled: true,
    }),
  );

  const tenantId = result.DistributionTenant?.Id;
  invariant(tenantId, "CloudFront returned a tenant without an id");

  return {
    tenantId,
    routingEndpoint: await getRoutingEndpoint(),
    active: checkIsTenantActive(result.DistributionTenant?.Domains),
  };
}

/**
 * Read a tenant's current state. Returns null when the tenant is gone, which
 * the caller treats as "reprovision" rather than as an error.
 */
export async function getDomainTenant(
  tenantId: string,
): Promise<DomainTenant | null> {
  const result = await getTenantWithETag(tenantId);
  if (!result) {
    return null;
  }
  return {
    tenantId,
    routingEndpoint: await getRoutingEndpoint(),
    active: checkIsTenantActive(result.tenant.Domains),
  };
}

async function getTenantWithETag(tenantId: string) {
  try {
    const result = await getCloudFrontClient().send(
      new GetDistributionTenantCommand({ Identifier: tenantId }),
    );
    if (!result.DistributionTenant || !result.ETag) {
      return null;
    }
    return { tenant: result.DistributionTenant, etag: result.ETag };
  } catch (error) {
    if (error instanceof EntityNotFound) {
      return null;
    }
    throw error;
  }
}

function checkIsTenantActive(
  domains: { Status?: string | undefined }[] | undefined,
): boolean {
  return Boolean(
    domains?.length && domains.every((domain) => domain.Status === "active"),
  );
}

/**
 * Delete the tenant backing a custom domain. Idempotent — a tenant that is
 * already gone is a success, so removing a domain never wedges on a failed
 * earlier attempt.
 *
 * Tenants are billed, so this has to run on every path that stops serving a
 * domain: removal, project deletion, and losing the entitlement.
 */
export async function deleteDomainTenant(tenantId: string): Promise<void> {
  const result = await getTenantWithETag(tenantId);
  if (!result) {
    return;
  }
  try {
    await getCloudFrontClient().send(
      new DeleteDistributionTenantCommand({
        Id: tenantId,
        IfMatch: result.etag,
      }),
    );
  } catch (error) {
    if (error instanceof EntityNotFound) {
      return;
    }
    throw error;
  }
}

/**
 * Whether an error from CloudFront will still be there on the next attempt.
 *
 * The common one is `CNAMEAlreadyExists`: domain association is unique across
 * all of CloudFront, not just this account, so a hostname another distribution
 * already serves can never be provisioned by retrying. Polling such a domain
 * forever costs API calls and tells the customer nothing, so it is marked failed
 * and the reason is surfaced instead.
 */
export function checkIsTerminalTenantError(error: unknown): boolean {
  return (
    error instanceof CNAMEAlreadyExists ||
    error instanceof EntityAlreadyExists ||
    error instanceof EntityLimitExceeded ||
    error instanceof InvalidArgument
  );
}
