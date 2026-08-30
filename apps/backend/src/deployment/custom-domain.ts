import config from "@/config";
import { isUniqueViolationError } from "@/database/error";
import { Account, ProjectDomain } from "@/database/models";
import {
  checkIsActiveSubscriptionStatus,
  type AccountSubscriptionStatus,
} from "@/database/models/Account";
import {
  attachProductionDomainAlias,
  detachDomainAlias,
} from "@/database/services/project-domain";
import { boom } from "@/util/error";

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
 * Whether an account may use custom domains, and when it may not, what would
 * change that.
 *
 * One function rather than a boolean plus a second guess in the UI: the answer
 * decides both whether the mutation is honoured and which call to action the
 * settings card offers, and those two must never disagree about why the feature
 * is closed.
 *
 * `getPlan()` is not sufficient on its own. It resolves the plan of any
 * subscription that is merely `trialing` or `past_due`, so reading
 * `customDomainsIncluded` off it would hand the feature to a team that has
 * never paid.
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

  // A forced plan is one we set by hand, so there is no self-service path off
  // it — subscribing is not the answer, talking to us is.
  if (input.hasForcedPlan) {
    return input.planIncludesCustomDomains ? "available" : "requires_contact";
  }

  if (!checkIsActiveSubscriptionStatus(input.subscriptionStatus)) {
    return "requires_subscription";
  }

  // Paying, but on a plan without the feature. A plan change is not something
  // the team can do to itself either.
  return input.planIncludesCustomDomains ? "available" : "requires_contact";
}

/**
 * Resolve `getCustomDomainsAvailability` for an account.
 */
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

/**
 * The guard behind every custom-domain mutation.
 */
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

  // Read before any tenant exists, and stored on the row whatever happens next.
  // This is the DNS target the customer has to publish, and until they do,
  // CloudFront refuses to create the tenant at all — so showing it is the
  // entire content of the pending state.
  const routingEndpoint = getCustomDomainsTarget();

  let projectDomain: ProjectDomain;
  try {
    projectDomain = await ProjectDomain.query().insertAndFetch({
      domain,
      environment: "production",
      branch: null,
      projectId: input.projectId,
      internal: false,
      status: "pending",
      routingEndpoint,
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
      console.error(error);
      throw boom(400, "This domain cannot be used", {
        code: "PROJECT_DOMAIN_ALREADY_USED",
        cause: error,
      });
    }
    // Everything else is a wait, not a failure — most often the domain simply
    // does not resolve to CloudFront yet, which is the expected state of a
    // domain the customer has this second finished typing. The row stays
    // pending with its DNS instructions and the reconcile cron takes it from
    // there.
    return projectDomain;
  }
}

/**
 * Bring a custom domain's row in line with CloudFront: create the tenant once
 * the customer's DNS record makes that possible, then copy the tenant's state
 * onto the row.
 *
 * Safe to call repeatedly — it is the tail of `addCustomDomain`, the body of
 * the status poll, and what the "Check" button runs.
 */
export async function reconcileCustomDomain(
  projectDomain: ProjectDomain,
): Promise<ProjectDomain> {
  if (projectDomain.internal) {
    return projectDomain;
  }

  let resolvedTenant = projectDomain.cloudfrontTenantId
    ? await getDomainTenant(projectDomain.cloudfrontTenantId)
    : null;

  // A tenant with no certificate attached is not progressing on its own, and
  // there are two different reasons for it — so ask CloudFront which.
  //
  // "Managed" covers issuing the certificate, not applying it. Once it reaches
  // `issued` nothing further happens: the domain stays `inactive` until the
  // certificate is explicitly attached. Polling alone would wait forever.
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
      // No request in flight, or one that failed or timed out. Ask again —
      // usually the DNS record has since appeared.
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
      // The expected state until the customer publishes the record. Recorded as
      // a wait rather than an error, so the card keeps showing the DNS
      // instructions instead of a failure the customer cannot act on.
      //
      // The endpoint is written here too, not only on insert: rows added before
      // the tenant creation moved behind DNS have none, and without it the card
      // has no record to tell the customer to create.
      return projectDomain.$query().patchAndFetch({
        status: "pending",
        routingEndpoint: getCustomDomainsTarget(),
        statusReason: null,
        lastCheckedAt: new Date().toISOString(),
      });
    }
  }

  const wasActive = projectDomain.status === "active";

  const updated = await projectDomain.$query().patchAndFetch({
    cloudfrontTenantId: resolvedTenant.tenantId,
    routingEndpoint: resolvedTenant.routingEndpoint,
    status: resolvedTenant.active ? "active" : "pending",
    // Cleared on every reconcile that gets this far, not only on activation: a
    // reason left over from an earlier failure otherwise outlives the thing it
    // described and is read as the current state.
    statusReason: null,
    lastCheckedAt: new Date().toISOString(),
    ...(resolvedTenant.active && !wasActive
      ? { activatedAt: new Date().toISOString() }
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
