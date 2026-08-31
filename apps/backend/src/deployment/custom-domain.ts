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
 * Claim a hostname for a project, taking it from a project that never proved it
 * owned it.
 *
 * `project_domains.domain` is unique across every project, so the first team to
 * type a hostname used to hold it forever — including one they had no claim to,
 * which left the real owner with no path at all. But a row with no
 * `cloudfrontTenantId` is exactly a hostname nobody has proven anything about:
 * a tenant is only created once CloudFront has verified the domain resolves to
 * us, so until then the claim is a string someone typed into a form. Those are
 * takeable. A row that has a tenant is not, and neither is an internal domain.
 *
 * Whoever holds the row when the DNS record goes live is the owner, which is
 * the same proof CloudFront itself requires.
 *
 * Expressed as one conditional upsert rather than a read followed by a write:
 * Postgres skips `DO UPDATE` when the `WHERE` does not hold and returns no row,
 * so two teams racing on the same hostname cannot both pass a check, and a
 * verified domain cannot be taken even under a race. Returns null when the
 * hostname is spoken for.
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
      // The previous holder's diagnostics describe a claim that no longer
      // exists, so none of it carries over.
      statusReason: null,
      activatedAt: null,
      lastCheckedAt: null,
      updatedAt: new Date().toISOString(),
    })
    .where("project_domains.cloudfrontTenantId", null)
    .andWhere("project_domains.internal", false)
    .returning("*");

  // A refused upsert still resolves to the model we asked Objection to insert —
  // it just never reached the database, so it has no id. That is the signal, not
  // a null return.
  //
  // No alias needs clearing on a takeover: one is written only when a domain
  // goes active, which requires the tenant this row provably never had.
  return claimed.id ? claimed : null;
}

/**
 * Attach a custom domain to a project's production deployments.
 *
 * The row is claimed before the tenant exists, so two requests racing on the
 * same hostname are settled in Postgres rather than by two CloudFront tenants
 * both claiming it. A row whose tenant creation then fails stays `pending` with
 * no tenant id, which `reconcileCustomDomain` retries — and which leaves the
 * hostname claimable by someone who can actually prove they own it.
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
      // Nothing will ever make this hostname work — it is already associated
      // with another CloudFront resource. Drop the row rather than leaving one
      // that can only ever be polled and never serve.
      //
      // Re-read under the lock first: a concurrent reconcile may have created
      // the tenant between our failure and this cleanup, and deleting the row
      // then would strand a tenant nothing names.
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
      // — a missing IAM permission being the likeliest. Record it on the row and
      // log it, because otherwise the customer is shown a perfectly normal
      // "add this record" card for a domain that can never provision, and
      // nothing anywhere says why.
      logger.error(
        { error, domain },
        "Failed to provision a custom domain on creation",
      );
      return projectDomain.$query().patchAndFetch({
        statusReason: getReconcileErrorMessage(error),
        lastCheckedAt: new Date().toISOString(),
      });
    }

    // The expected first answer: the customer has not published the record yet.
    // The row stays pending with its DNS instructions and the poll takes over.
    return projectDomain;
  }
}

/**
 * How long one domain's reconcile may hold its lock.
 *
 * Generous because the body can make four CloudFront calls, and a lock that
 * expires mid-run is worse than a slow one: the whole point is that two
 * reconciles of the same domain never overlap.
 */
const RECONCILE_LOCK_TIMEOUT = 60_000;

/**
 * Serialize everything that writes one domain's row.
 *
 * Three callers reconcile the same domain — the add mutation, the "Check"
 * button, and the cron — and the cron schedules a just-added row first
 * (`lastCheckedAt` is null and it orders nulls first), so the collision window
 * is exactly the seconds after a domain is added. Two concurrent runs both read
 * `cloudfrontTenantId` as null and both call `CreateDistributionTenant` with the
 * same deterministic name; the loser gets `EntityAlreadyExists`, which is
 * terminal, and either deletes a row whose tenant now exists or marks a healthy
 * domain failed.
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

  return withCustomDomainLock(projectDomain.id, async () => {
    // Re-read inside the lock. The caller's copy was loaded before we queued
    // for it, so anything the previous holder wrote — a tenant id, an active
    // status — is invisible to it, and acting on it would redo work that has
    // already happened.
    const current = await ProjectDomain.query().findById(projectDomain.id);
    if (!current) {
      // Removed while we waited. Nothing to reconcile, and recreating the
      // tenant would strand it.
      return projectDomain;
    }
    return unsafe_reconcileCustomDomain(current);
  });
}

/**
 * The reconcile body. Assumes the caller holds the domain's lock and has read
 * the row inside it.
 */
async function unsafe_reconcileCustomDomain(
  projectDomain: ProjectDomain,
): Promise<ProjectDomain> {
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
      //
      // The tenant id is cleared for the same reason. This branch is also
      // reached when the tenant vanished out of band, and a row left pointing at
      // a tenant that no longer exists reports `certificate` as its pending
      // reason — which hides the very DNS record the customer has to publish to
      // get out of this state.
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

  // The alias is written *before* the row says active, because the alias is what
  // actually serves the domain: `resolveDeploymentByDomain` reads
  // `deployment_aliases`, not this table. Patching first would leave a row
  // reading "Active" whose hostname 404s, and the poll only selects `pending`,
  // so nothing would ever come back to finish the job.
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
    // Cleared on every reconcile that gets this far, not only on activation: a
    // reason left over from an earlier failure otherwise outlives the thing it
    // described and is read as the current state.
    statusReason: null,
    lastCheckedAt: new Date().toISOString(),
    ...(isActive && !wasActive
      ? { activatedAt: new Date().toISOString() }
      : {}),
  });

  if (isActive && !wasActive) {
    // Best effort, and deliberately after the patch: the resolve endpoint
    // answered 404 while the domain was not yet serving and caches that for five
    // minutes, but a purge that fails is a domain that goes live a few minutes
    // late — not a reason to roll back an activation that has otherwise
    // completed, or to re-run the whole reconcile.
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
      // One domain's failure must not stall the rest of the batch.
      await recordReconcileFailure(projectDomain.id, error);
    }
  }
}

/**
 * Record why a reconcile failed, without overwriting a result that landed while
 * it was failing.
 *
 * Under the same lock and re-reading the row, because the failure is only the
 * truth about the domain if nothing has succeeded since: a reconcile from
 * another caller can complete between this one throwing and this one writing,
 * and a blind patch from the stale in-memory row would mark a domain that is
 * now serving as `failed` — a state the poll never revisits.
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
      // A terminal error is about the hostname itself and will not resolve on
      // its own, so it stops being polled. Everything else stays `pending` and
      // is retried next run.
      ...(isTerminal ? { status: "failed" } : {}),
      statusReason: getReconcileErrorMessage(error),
      lastCheckedAt: new Date().toISOString(),
    });
  });
}

/**
 * The reason shown on the domain's card.
 *
 * Raw CloudFront messages are written through for the cases a customer can act
 * on — a hostname already in use elsewhere is the whole story in one sentence.
 * Anything else is ours to fix, not theirs, so it is logged in full and reported
 * as such rather than surfacing an AWS exception string to someone who has done
 * nothing wrong.
 */
export function getReconcileErrorMessage(error: unknown): string {
  if (checkIsTerminalTenantError(error)) {
    return error instanceof Error ? error.message : String(error);
  }
  return "Argos could not reach CloudFront to set this domain up. We are looking into it — no action is needed on your side.";
}
