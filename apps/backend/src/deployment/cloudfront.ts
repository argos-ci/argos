import { invariant } from "@argos/util/invariant";
import {
  CloudFrontClient,
  CNAMEAlreadyExists,
  CreateDistributionTenantCommand,
  DeleteDistributionTenantCommand,
  EntityAlreadyExists,
  EntityNotFound,
  GetDistributionTenantCommand,
  GetManagedCertificateDetailsCommand,
  InvalidArgument,
  UpdateDistributionTenantCommand,
  type ManagedCertificateStatus,
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

/**
 * The hostname customers point their DNS record at.
 *
 * A name of ours, not the connection group's own `dxxxx.cloudfront.net`, which
 * would otherwise be copied into every customer's zone and could then never be
 * changed — recreating the connection group would break every custom domain at
 * once, with no way to reach the people who would have to fix it.
 *
 * The record itself is created by `ArgosDeploymentStack`, which builds the same
 * name from the same base domain. The two have to agree, so neither prefix
 * moves without the other.
 */
export function getCustomDomainsTarget(): string {
  return `cname.${config.get("deployments.baseDomain").toLowerCase()}`;
}

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
  /** The hostname the customer points their DNS record at. */
  routingEndpoint: string;
  /** True once CloudFront has issued the certificate and serves the domain. */
  active: boolean;
  /**
   * Whether the tenant has a certificate at all.
   *
   * A tenant can exist without one: CloudFront creates it and then requests the
   * certificate, and if that second step fails the tenant survives with no
   * certificate and no pending request. Nothing retries it on CloudFront's
   * side, so the domain sits inactive forever unless we ask again.
   */
  hasCertificate: boolean;
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
    routingEndpoint: getCustomDomainsTarget(),
    active: checkIsTenantActive(result.DistributionTenant?.Domains),
    hasCertificate: Boolean(
      result.DistributionTenant?.Customizations?.Certificate?.Arn,
    ),
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
    routingEndpoint: getCustomDomainsTarget(),
    active: checkIsTenantActive(result.tenant.Domains),
    hasCertificate: Boolean(result.tenant.Customizations?.Certificate?.Arn),
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
 * Called only where the `project_domains` row itself goes away — removing a
 * domain, and deleting a project. Losing the paid entitlement deliberately does
 * not delete anything: an idle tenant costs little, and a team that resubscribes
 * finds its domains where it left them. If that ever adds up, the cheap fix is a
 * sweep that reconciles CloudFront's tenant list against this table, not a
 * deletion wired into the billing path.
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
 * Whether an error from CloudFront is about *this domain* and will still be
 * there on the next attempt.
 *
 * Both entries are properties of the hostname, not of our account or the
 * moment: domain association is unique across all of CloudFront, so a name
 * another distribution already serves can never be provisioned by retrying.
 * Polling such a domain forever costs API calls and tells the customer nothing,
 * so it is marked failed and the reason is surfaced instead.
 *
 * `EntityLimitExceeded` is deliberately absent. It means *we* have run out of
 * tenants, which says nothing about the customer's hostname and clears the
 * moment the quota is raised — treating it as terminal would delete the row of
 * every customer adding a domain during the outage and permanently fail every
 * one already waiting.
 */
export function checkIsTerminalTenantError(error: unknown): boolean {
  return (
    error instanceof CNAMEAlreadyExists || error instanceof EntityAlreadyExists
  );
}

/**
 * Whether CloudFront refused because the domain does not resolve to it yet.
 *
 * This is the normal state of a domain a customer has just added, not a fault:
 * `ValidationTokenHost: "cloudfront"` has CloudFront answer the HTTP challenge
 * at the domain itself, which it can only do once the DNS record exists. So the
 * tenant cannot be created until the customer has pointed the record — the
 * opposite order to the one the flow reads in.
 *
 * Matched on the message as well as the class because `InvalidArgument` also
 * covers genuine misconfiguration, such as a wrong distribution id, which
 * should not be reported to a customer as "waiting for DNS".
 */
export function checkIsDomainNotPointedError(error: unknown): boolean {
  return (
    error instanceof InvalidArgument &&
    /verify domain name ownership/i.test(error.message)
  );
}

/**
 * Ask CloudFront to issue the certificate for a tenant that has none.
 *
 * The repair for a tenant created before its certificate could be requested —
 * the shape a failed `RequestCertificate` leaves behind. CloudFront never
 * retries that on its own, so without this the domain stays inactive however
 * long it is polled.
 */
export async function requestDomainTenantCertificate(input: {
  tenantId: string;
  domain: string;
}): Promise<DomainTenant | null> {
  const existing = await getTenantWithETag(input.tenantId);
  if (!existing) {
    return null;
  }

  const result = await getCloudFrontClient().send(
    new UpdateDistributionTenantCommand({
      Id: input.tenantId,
      IfMatch: existing.etag,
      ManagedCertificateRequest: {
        ValidationTokenHost: "cloudfront",
        PrimaryDomainName: input.domain,
      },
    }),
  );

  return {
    tenantId: input.tenantId,
    routingEndpoint: getCustomDomainsTarget(),
    active: checkIsTenantActive(result.DistributionTenant?.Domains),
    hasCertificate: Boolean(
      result.DistributionTenant?.Customizations?.Certificate?.Arn,
    ),
  };
}

export type DomainCertificate = {
  arn: string | null;
  status: ManagedCertificateStatus | null;
};

/**
 * The state of the certificate CloudFront is managing for a tenant.
 *
 * Keyed by tenant rather than looked up in ACM by domain name: several
 * certificates can cover the same name once a request has been retried, and
 * only CloudFront knows which one belongs to this tenant.
 */
export async function getDomainTenantCertificate(
  tenantId: string,
): Promise<DomainCertificate | null> {
  try {
    const result = await getCloudFrontClient().send(
      new GetManagedCertificateDetailsCommand({ Identifier: tenantId }),
    );
    const details = result.ManagedCertificateDetails;
    if (!details) {
      return null;
    }
    return {
      arn: details.CertificateArn ?? null,
      status: details.CertificateStatus ?? null,
    };
  } catch (error) {
    if (error instanceof EntityNotFound) {
      return null;
    }
    throw error;
  }
}

/**
 * Apply an issued certificate to its tenant, which is what actually puts the
 * domain into service.
 *
 * Issuing and applying are two steps, and only the first is managed: the
 * certificate reaches `issued` on its own, and then nothing happens. The domain
 * stays `inactive` — for hours, indefinitely — until it is attached here.
 */
export async function attachDomainTenantCertificate(input: {
  tenantId: string;
  certificateArn: string;
}): Promise<DomainTenant | null> {
  const existing = await getTenantWithETag(input.tenantId);
  if (!existing) {
    return null;
  }

  const result = await getCloudFrontClient().send(
    new UpdateDistributionTenantCommand({
      Id: input.tenantId,
      IfMatch: existing.etag,
      Customizations: { Certificate: { Arn: input.certificateArn } },
    }),
  );

  return {
    tenantId: input.tenantId,
    routingEndpoint: getCustomDomainsTarget(),
    active: checkIsTenantActive(result.DistributionTenant?.Domains),
    hasCertificate: Boolean(
      result.DistributionTenant?.Customizations?.Certificate?.Arn,
    ),
  };
}
