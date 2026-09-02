import config from "@/config";
import { Account, ProjectDomain } from "@/database/models";
import {
  checkIsActiveSubscriptionStatus,
  type AccountSubscriptionStatus,
} from "@/database/models/Account";
import {
  attachProductionDomainAlias,
  detachDomainAlias,
} from "@/database/services/project-domain";
import logger from "@/logger";
import { boom } from "@/util/error";
import { redisLock } from "@/util/redis";

import {
  attachDomainTenantCertificate,
  checkIsCustomDomainsConfigured,
  checkIsDomainNotPointedError,
  checkIsTerminalTenantError,
  createDomainTenant,
  deleteDomainTenant,
  getCustomDomainsTarget,
  getDomainTenant,
  getDomainTenantCertificate,
  requestDomainTenantCertificate,
} from "./cloudfront";
import { invalidateDeploymentCache } from "./invalidate";

const DOMAIN_REGEX =
  /^(?=.{1,255}$)(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/;

export type CustomDomainsAvailability =
  | "available"
  | "requires_subscription"
  | "requires_contact"
  | "requires_team";

/**
 * `planIncludesCustomDomains` alone is not enough: `getPlan()` resolves the plan
 * of any subscription that is merely `trialing` or `past_due`, so the status has
 * to be checked too or a team that never paid gets the feature.
 */
export function getCustomDomainsAvailability(input: {
  accountType: "user" | "team";
  hasForcedPlan: boolean;
  subscriptionStatus: AccountSubscriptionStatus | null;
  planIncludesCustomDomains: boolean;
}): CustomDomainsAvailability {
  if (input.accountType !== "team") {
    return "requires_team";
  }

  // A forced plan is set by hand, so there is no checkout that would change it.
  if (input.hasForcedPlan) {
    return input.planIncludesCustomDomains ? "available" : "requires_contact";
  }

  if (!checkIsActiveSubscriptionStatus(input.subscriptionStatus)) {
    return "requires_subscription";
  }

  return input.planIncludesCustomDomains ? "available" : "requires_contact";
}

export async function getAccountCustomDomainsAvailability(
  account: Account,
): Promise<CustomDomainsAvailability> {
  const manager = account.$getSubscriptionManager();
  const [plan, subscriptionStatus] = await Promise.all([
    manager.getPlan(),
    manager.getSubscriptionStatus(),
  ]);

  return getCustomDomainsAvailability({
    accountType: account.type,
    hasForcedPlan: account.forcedPlanId !== null,
    subscriptionStatus,
    planIncludesCustomDomains: Boolean(plan?.customDomainsIncluded),
  });
}

export async function checkHasAccessToCustomDomains(
  account: Account,
): Promise<boolean> {
  return (await getAccountCustomDomainsAvailability(account)) === "available";
}

function getReservedSuffixes(): string[] {
  const suffixes = [config.get("deployments.baseDomain").toLowerCase()];
  for (const url of [config.get("server.url"), config.get("api.baseUrl")]) {
    try {
      suffixes.push(new URL(url).hostname.toLowerCase());
    } catch {
      // A malformed configured URL simply reserves nothing.
    }
  }
  return suffixes;
}

/**
 * `deployment_aliases.alias` is a flat namespace shared with internal domains and
 * branch aliases, so a customer allowed to claim an Argos-owned name would take
 * over routing that is not theirs.
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
 * Claim a hostname, taking it from a holder that never proved it owned it.
 *
 * A row with no `cloudfrontTenantId` is a hostname nobody has proven anything
 * about: the tenant is created only once CloudFront has verified the domain
 * resolves to us. Until then the claim is a string someone typed into a form, so
 * it moves to whoever asks next; a row with a tenant does not.
 *
 * One conditional upsert, because Postgres skips `DO UPDATE` when the `WHERE`
 * does not hold — so two teams racing cannot both pass a check. Returns null
 * when the hostname is spoken for.
 */
export async function claimCustomDomain(input: {
  projectId: string;
  domain: string;
  routingEndpoint: string;
}): Promise<ProjectDomain | null> {
  const { projectId, domain, routingEndpoint } = input;

  const claimed = await ProjectDomain.query()
    .insert({
      domain,
      environment: "production",
      branch: null,
      projectId,
      internal: false,
      status: "pending",
      routingEndpoint,
    })
    .onConflict("domain")
    .merge({
      projectId,
      status: "pending",
      routingEndpoint,
      statusReason: null,
      activatedAt: null,
      lastCheckedAt: null,
      updatedAt: new Date().toISOString(),
    })
    .where("project_domains.cloudfrontTenantId", null)
    .andWhere("project_domains.internal", false)
    .returning("*");

  // A refused upsert still resolves to the model we asked Objection to insert;
  // it just never reached the database, so the id is the signal, not a null.
  return claimed.id ? claimed : null;
}

/**
 * The row is claimed before the tenant exists, so a failed provision leaves a
 * `pending` row with no tenant id — retried by the poll, and claimable by
 * someone who can prove they own the hostname.
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

  const routingEndpoint = getCustomDomainsTarget();

  const projectDomain = await claimCustomDomain({
    projectId: input.projectId,
    domain,
    routingEndpoint,
  });

  if (!projectDomain) {
    throw boom(400, "Domain already in use", {
      code: "PROJECT_DOMAIN_ALREADY_USED",
    });
  }

  try {
    return await reconcileCustomDomain(projectDomain);
  } catch (error) {
    if (checkIsTerminalTenantError(error)) {
      // The hostname belongs to another CloudFront resource and never will
      // work, so the row goes. Re-read under the lock: a concurrent reconcile
      // may have created the tenant since, and deleting the row then would
      // strand it.
      await withCustomDomainLock(projectDomain.id, async () => {
        const current = await ProjectDomain.query().findById(projectDomain.id);
        if (current && !current.cloudfrontTenantId) {
          await current.$query().delete();
        }
      });
      throw boom(400, "This domain cannot be used", {
        code: "PROJECT_DOMAIN_ALREADY_USED",
        cause: error,
      });
    }

    if (!checkIsDomainNotPointedError(error)) {
      // Not the ordinary "DNS is not published yet" wait, so it is ours to fix
      // — a missing IAM permission being the likeliest. Recorded on the row so
      // the customer is not left with a normal-looking "add this record" card
      // for a domain that can never provision.
      logger.error(
        { error, domain },
        "Failed to provision a custom domain on creation",
      );
      return projectDomain.$query().patchAndFetch({
        statusReason: getReconcileErrorMessage(error),
        lastCheckedAt: new Date().toISOString(),
      });
    }

    // The expected first answer, not a failure: the record is not published yet.
    return projectDomain;
  }
}

/** Generous: the body can make four CloudFront calls, and a lock that expires
 * mid-run defeats the point of holding one. */
const RECONCILE_LOCK_TIMEOUT = 60_000;

/**
 * Serialize everything that writes one domain's row.
 *
 * The add mutation, the "Check" button and the cron all reconcile, and the cron
 * schedules a just-added row first, so they collide most readily seconds after a
 * domain is added. Unserialized, both read a null `cloudfrontTenantId` and both
 * create a tenant under the same deterministic name; the loser's
 * `EntityAlreadyExists` is terminal, which either deletes a row whose tenant now
 * exists or marks a healthy domain failed.
 */
function withCustomDomainLock<T>(
  projectDomainId: string,
  task: () => Promise<T>,
): Promise<T> {
  return redisLock.acquire(["custom-domain", projectDomainId], task, {
    timeout: RECONCILE_LOCK_TIMEOUT,
  });
}

/**
 * Bring a domain's row in line with CloudFront. Idempotent, and called from all
 * three paths above.
 */
export async function reconcileCustomDomain(
  projectDomain: ProjectDomain,
): Promise<ProjectDomain> {
  if (projectDomain.internal) {
    return projectDomain;
  }

  return withCustomDomainLock(projectDomain.id, async () => {
    // The caller's copy predates the queue wait, so whatever the previous
    // holder wrote is invisible to it.
    const current = await ProjectDomain.query().findById(projectDomain.id);
    if (!current) {
      // Removed while we waited; recreating the tenant would strand it.
      return projectDomain;
    }
    return unsafe_reconcileCustomDomain(current);
  });
}

/** Assumes the caller holds the domain's lock and read the row inside it. */
async function unsafe_reconcileCustomDomain(
  projectDomain: ProjectDomain,
): Promise<ProjectDomain> {
  let resolvedTenant = projectDomain.cloudfrontTenantId
    ? await getDomainTenant(projectDomain.cloudfrontTenantId)
    : null;

  // "Managed" covers issuing the certificate, not applying it: once it reaches
  // `issued` nothing further happens on CloudFront's side and the domain stays
  // `inactive` until it is attached here. Polling alone would wait forever.
  if (resolvedTenant && !resolvedTenant.hasCertificate) {
    const certificate = await getDomainTenantCertificate(
      resolvedTenant.tenantId,
    );

    if (certificate?.status === "issued" && certificate.arn) {
      resolvedTenant =
        (await attachDomainTenantCertificate({
          tenantId: resolvedTenant.tenantId,
          certificateArn: certificate.arn,
        })) ?? resolvedTenant;
    } else if (certificate?.status !== "pending-validation") {
      // No request in flight, or one that failed. Ask again — usually the DNS
      // record has since appeared.
      try {
        resolvedTenant =
          (await requestDomainTenantCertificate({
            tenantId: resolvedTenant.tenantId,
            domain: projectDomain.domain,
          })) ?? resolvedTenant;
      } catch (error) {
        if (!checkIsDomainNotPointedError(error)) {
          throw error;
        }
      }
    }
  }

  if (!resolvedTenant) {
    try {
      resolvedTenant = await createDomainTenant({
        projectDomainId: projectDomain.id,
        domain: projectDomain.domain,
      });
    } catch (error) {
      if (!checkIsDomainNotPointedError(error)) {
        throw error;
      }
      // A wait, not an error, so the card keeps showing the DNS instructions.
      //
      // The tenant id is cleared because this branch is also reached when the
      // tenant vanished out of band, and a row still pointing at a dead tenant
      // reports `certificate` as its pending reason — hiding the very record the
      // customer has to publish.
      return projectDomain.$query().patchAndFetch({
        status: "pending",
        cloudfrontTenantId: null,
        routingEndpoint: getCustomDomainsTarget(),
        statusReason: null,
        lastCheckedAt: new Date().toISOString(),
      });
    }
  }

  const wasActive = projectDomain.status === "active";
  const isActive = resolvedTenant.active;

  // Before the row says active, because the alias is what actually serves the
  // domain — `resolveDeploymentByDomain` reads `deployment_aliases`, not this
  // table. Patching first would leave an "Active" row whose hostname 404s, in a
  // state the poll never revisits.
  if (isActive && !wasActive) {
    await attachProductionDomainAlias({
      projectId: projectDomain.projectId,
      domain: projectDomain.domain,
    });
  }

  const updated = await projectDomain.$query().patchAndFetch({
    cloudfrontTenantId: resolvedTenant.tenantId,
    routingEndpoint: resolvedTenant.routingEndpoint,
    status: isActive ? "active" : "pending",
    // Cleared on every success, or a stale reason outlives what it described.
    statusReason: null,
    lastCheckedAt: new Date().toISOString(),
    ...(isActive && !wasActive
      ? { activatedAt: new Date().toISOString() }
      : {}),
  });

  if (isActive && !wasActive) {
    // The 404 from before the domain was serving is cached for five minutes.
    // Best effort: a failed purge only delays going live.
    await invalidateDeploymentCache(updated.domain).catch((error: unknown) => {
      logger.error(
        { error, domain: updated.domain },
        "Failed to purge the deployment cache for a custom domain",
      );
    });
  }

  return updated;
}

/**
 * Deletes the tenant first: a row removed while its tenant survives is an
 * invisible recurring charge that nothing sweeps up.
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

/** CloudFront's control plane is rate-limited and each domain costs two calls. */
const RECONCILE_BATCH_SIZE = 50;

/**
 * Certificate issuance completes minutes to hours after the customer points
 * their DNS and nothing announces it, so polling is the only thing that moves a
 * domain to `active` before the project's next deployment.
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
      await recordReconcileFailure(projectDomain.id, error);
    }
  }
}

/**
 * A failure is only the truth about a domain if nothing has succeeded since —
 * another caller's reconcile can land between this one throwing and writing — so
 * this takes the lock, re-reads, and leaves anything no longer `pending` alone.
 */
export async function recordReconcileFailure(
  projectDomainId: string,
  error: unknown,
): Promise<void> {
  await withCustomDomainLock(projectDomainId, async () => {
    const current = await ProjectDomain.query().findById(projectDomainId);
    if (!current || current.status !== "pending") {
      return;
    }

    const isTerminal = checkIsTerminalTenantError(error);

    if (!isTerminal) {
      logger.error(
        { error, domain: current.domain },
        "Failed to reconcile a custom domain",
      );
    }

    await current.$query().patch({
      ...(isTerminal ? { status: "failed" } : {}),
      statusReason: getReconcileErrorMessage(error),
      lastCheckedAt: new Date().toISOString(),
    });
  });
}

/**
 * Split by who can act on it: a terminal error is about the customer's hostname
 * and its message is the whole story, while anything else is ours and would
 * otherwise show an AWS exception string to someone who did nothing wrong.
 */
export function getReconcileErrorMessage(error: unknown): string {
  if (checkIsTerminalTenantError(error)) {
    return error instanceof Error ? error.message : String(error);
  }
  return "Argos could not reach CloudFront to set this domain up. We are looking into it — no action is needed on your side.";
}
