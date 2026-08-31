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
 * Development and self-hosted installs have no multi-tenant distribution, so the
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
 * Ours rather than the connection group's own `dxxxx.cloudfront.net`, which
 * would be copied into every customer's zone and could then never be changed.
 * `ArgosDeploymentStack` builds the same name from the same base domain, so the
 * prefix cannot move on one side alone.
 */
export function getCustomDomainsTarget(): string {
  return `cname.${config.get("deployments.baseDomain").toLowerCase()}`;
}

/**
 * From the row id, not the domain: tenant names accept a narrower character set
 * than hostnames, and renaming a domain would strand the tenant under its old
 * name.
 */
function getTenantName(projectDomainId: string): string {
  return `argos-${projectDomainId}`;
}

export type DomainTenant = {
  tenantId: string;
  routingEndpoint: string;
  active: boolean;
  /**
   * A tenant can exist without a certificate: CloudFront creates it and then
   * requests one, and if that second step fails nothing on its side retries, so
   * the domain sits inactive until we ask again.
   */
  hasCertificate: boolean;
};

/**
 * One tenant per domain, never per project: CloudFront allows a single pending
 * certificate request per tenant, so a second domain added while the first was
 * validating would be rejected.
 *
 * `ValidationTokenHost: "cloudfront"` is what keeps the customer's side to one
 * DNS record — CloudFront answers the HTTP challenge itself once the domain
 * resolves to it, instead of asking for a TXT record.
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

/** Null when the tenant is gone, which the caller treats as "reprovision". */
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
 * Idempotent, so removing a domain never wedges on a failed earlier attempt.
 *
 * Called only where the `project_domains` row goes away. Losing the paid
 * entitlement deliberately deletes nothing — see the Costs note in
 * infra/README.md.
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
 * Whether the error is about *this hostname* and so will still be there next
 * time. Domain association is unique across all of CloudFront, so a name another
 * distribution serves can never be provisioned by retrying.
 *
 * `EntityLimitExceeded` looks like it belongs here and must not: it is our own
 * quota, so treating it as terminal fails every customer's domain during an
 * outage of ours.
 */
export function checkIsTerminalTenantError(error: unknown): boolean {
  return (
    error instanceof CNAMEAlreadyExists || error instanceof EntityAlreadyExists
  );
}

/**
 * The normal state of a just-added domain, not a fault: CloudFront answers the
 * HTTP challenge at the domain itself, so the tenant cannot exist until the
 * customer has pointed the record — the opposite order to the one the flow
 * reads in.
 *
 * Matched on the message too, because `InvalidArgument` also covers our own
 * misconfiguration, which must not be reported as "waiting for DNS".
 */
export function checkIsDomainNotPointedError(error: unknown): boolean {
  return (
    error instanceof InvalidArgument &&
    /verify domain name ownership/i.test(error.message)
  );
}

/**
 * The repair for a tenant whose certificate request failed — CloudFront never
 * retries that itself, so the domain would stay inactive however long it is
 * polled.
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
 * Keyed by tenant, not looked up in ACM by domain: several certificates can
 * cover one name once a request has been retried, and only CloudFront knows
 * which belongs to this tenant.
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
 * Issuing and applying are two steps and only the first is managed: a
 * certificate reaches `issued` on its own and then nothing happens, leaving the
 * domain `inactive` indefinitely until it is attached here.
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
