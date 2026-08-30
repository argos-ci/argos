import config from "@/config";
import { isUniqueViolationError } from "@/database/error";
import { Account, ProjectDomain } from "@/database/models";
import {
  attachProductionDomainAlias,
  detachDomainAlias,
} from "@/database/services/project-domain";
import { boom } from "@/util/error";

import {
  checkIsCustomDomainsConfigured,
  checkIsTerminalTenantError,
  createDomainTenant,
  deleteDomainTenant,
  getDomainTenant,
} from "./cloudfront";
import { invalidateDeploymentCache } from "./invalidate";

const DOMAIN_REGEX =
  /^(?=.{1,255}$)(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/;

/**
 * Custom domains are a paid feature. Read from the plan so that changing which
 * plans include it is a data change, matching `samlIncluded` and friends.
 */
export async function checkHasAccessToCustomDomains(
  account: Account,
): Promise<boolean> {
  const plan = await account.$getSubscriptionManager().getPlan();
  return Boolean(plan?.customDomainsIncluded);
}

function getReservedSuffixes(): string[] {
  const suffixes = [config.get("deployments.baseDomain").toLowerCase()];
  for (const url of [config.get("server.url"), config.get("api.baseUrl")]) {
    try {
      suffixes.push(new URL(url).hostname.toLowerCase());
    } catch {
      // A malformed configured URL reserves nothing; the regex below still runs.
    }
  }
  return suffixes;
}

/**
 * Validate a customer-supplied domain.
 *
 * Argos-owned names are rejected outright: `deployment_aliases.alias` is a flat
 * namespace shared with internal domains and branch aliases, so a customer who
 * claimed one would take over routing that does not belong to them.
 */
export function validateCustomDomain(domain: string): string {
  const normalizedDomain = domain.trim().toLowerCase();

  if (!DOMAIN_REGEX.test(normalizedDomain)) {
    throw boom(400, "Invalid domain", { code: "PROJECT_DOMAIN_INVALID" });
  }

  const isReserved = getReservedSuffixes().some(
    (suffix) =>
      normalizedDomain === suffix || normalizedDomain.endsWith(`.${suffix}`),
  );

  if (isReserved) {
    throw boom(400, "This domain is reserved", {
      code: "PROJECT_DOMAIN_RESERVED",
    });
  }

  return normalizedDomain;
}

/**
 * Attach a custom domain to a project's production deployments.
 *
 * The row is written before the tenant exists so that two requests racing on
 * the same hostname are settled by the unique constraint rather than by two
 * CloudFront tenants both claiming it. A row whose tenant creation then fails
 * stays `pending` with no tenant id, which `reconcileCustomDomain` retries.
 */
export async function addCustomDomain(input: {
  projectId: string;
  domain: string;
}): Promise<ProjectDomain> {
  if (!checkIsCustomDomainsConfigured()) {
    throw boom(400, "Custom domains are not available", {
      code: "PROJECT_DOMAIN_UNAVAILABLE",
    });
  }

  const domain = validateCustomDomain(input.domain);

  let projectDomain: ProjectDomain;
  try {
    projectDomain = await ProjectDomain.query().insertAndFetch({
      domain,
      environment: "production",
      branch: null,
      projectId: input.projectId,
      internal: false,
      status: "pending",
    });
  } catch (error) {
    if (isUniqueViolationError(error)) {
      throw boom(400, "Domain already in use", {
        code: "PROJECT_DOMAIN_ALREADY_USED",
      });
    }
    throw error;
  }

  try {
    return await reconcileCustomDomain(projectDomain);
  } catch (error) {
    if (checkIsTerminalTenantError(error)) {
      // Nothing will ever make this domain work — most often it is already
      // associated with another CloudFront resource. Drop the row rather than
      // leaving one that can only ever be polled and never serve.
      await projectDomain.$query().delete();
      throw boom(400, "This domain cannot be used", {
        code: "PROJECT_DOMAIN_ALREADY_USED",
      });
    }
    // Transient: the row stays pending and the reconcile cron picks it up.
    return projectDomain;
  }
}

/**
 * Bring a custom domain's row in line with CloudFront: create the tenant if it
 * is missing, then copy the tenant's state onto the row.
 *
 * Safe to call repeatedly — it is both the tail of `addCustomDomain` and the
 * body of the status poll.
 */
export async function reconcileCustomDomain(
  projectDomain: ProjectDomain,
): Promise<ProjectDomain> {
  if (projectDomain.internal) {
    return projectDomain;
  }

  const tenant = projectDomain.cloudfrontTenantId
    ? await getDomainTenant(projectDomain.cloudfrontTenantId)
    : null;

  const resolvedTenant =
    tenant ??
    (await createDomainTenant({
      projectDomainId: projectDomain.id,
      domain: projectDomain.domain,
    }));

  const wasActive = projectDomain.status === "active";

  const updated = await projectDomain.$query().patchAndFetch({
    cloudfrontTenantId: resolvedTenant.tenantId,
    routingEndpoint: resolvedTenant.routingEndpoint,
    status: resolvedTenant.active ? "active" : "pending",
    lastCheckedAt: new Date().toISOString(),
    ...(resolvedTenant.active && !wasActive
      ? { activatedAt: new Date().toISOString(), statusReason: null }
      : {}),
  });

  if (updated.status === "active" && !wasActive) {
    await attachProductionDomainAlias({
      projectId: updated.projectId,
      domain: updated.domain,
    });
    // The resolve endpoint answered 404 while the domain was not yet serving,
    // and that answer is cached for five minutes. Without this the domain stays
    // dark well after CloudFront starts routing it.
    await invalidateDeploymentCache(updated.domain);
  }

  return updated;
}

/**
 * Detach a custom domain. Deletes the CloudFront tenant first: a row removed
 * while its tenant survives is an invisible recurring charge, whereas a tenant
 * left without a row is caught by the next reconcile.
 */
export async function removeCustomDomain(
  projectDomain: ProjectDomain,
): Promise<void> {
  if (projectDomain.internal) {
    throw boom(400, "Internal domains cannot be removed", {
      code: "PROJECT_DOMAIN_INTERNAL",
    });
  }

  if (projectDomain.cloudfrontTenantId) {
    await deleteDomainTenant(projectDomain.cloudfrontTenantId);
  }

  await detachDomainAlias(projectDomain.domain);
  await projectDomain.$query().delete();
  await invalidateDeploymentCache(projectDomain.domain);
}

/**
 * Number of pending domains reconciled per run. CloudFront's control plane is
 * rate-limited and each domain costs two API calls, so the batch is capped and
 * the oldest-checked ones go first.
 */
const RECONCILE_BATCH_SIZE = 50;

/**
 * Advance every custom domain still waiting on CloudFront.
 *
 * Certificate issuance completes minutes to hours after the customer points
 * their DNS, and nothing tells us when. Polling is what moves a domain to
 * `active` and gets its alias attached — without it a domain would only ever
 * start serving on the project's next deployment.
 */
export async function reconcilePendingCustomDomains(): Promise<void> {
  if (!checkIsCustomDomainsConfigured()) {
    return;
  }

  const pendingDomains = await ProjectDomain.query()
    .where({ status: "pending", internal: false })
    .orderByRaw('"lastCheckedAt" asc nulls first')
    .limit(RECONCILE_BATCH_SIZE);

  for (const projectDomain of pendingDomains) {
    try {
      await reconcileCustomDomain(projectDomain);
    } catch (error) {
      // One domain's failure must not stall the rest of the batch. A retryable
      // error stays pending and is picked up next run; a terminal one stops
      // being polled. Either way the reason is surfaced in the UI.
      await projectDomain.$query().patch({
        ...(checkIsTerminalTenantError(error) ? { status: "failed" } : {}),
        statusReason: error instanceof Error ? error.message : String(error),
        lastCheckedAt: new Date().toISOString(),
      });
    }
  }
}
