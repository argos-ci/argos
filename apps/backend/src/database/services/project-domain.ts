import { slugify } from "@argos/util/slug";
import type { PartialModelRow } from "objection";

import config from "@/config";
import { boom } from "@/util/error";

import { isUniqueViolationError } from "../error";
import { Deployment, DeploymentAlias, ProjectDomain } from "../models";
import { transaction, type TransactionOrKnex } from "../transaction";

/**
 * Slugs a project may not take because something else already answers on them.
 * Each is a specific record in the zone, so it beats the wildcard — a project
 * handed one would hold a row for a domain whose requests go elsewhere.
 */
const INTERNAL_DOMAIN_SLUGS = new Set(["dev", "cname"]);

const DOMAIN_REGEX =
  /^(?=.{1,255}$)(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/;

function normalizeDomain(domain: string) {
  return domain.trim().toLowerCase();
}

function validateDomain(domain: string) {
  const normalizedDomain = normalizeDomain(domain);

  if (!DOMAIN_REGEX.test(normalizedDomain)) {
    throw boom(400, "Invalid domain", {
      code: "PROJECT_DOMAIN_INVALID",
    });
  }

  return normalizedDomain;
}

async function validateInternalDomain(domain: string, projectId: string) {
  const normalizedDomain = validateDomain(domain);
  const suffix = `.${getInternalDeploymentBaseDomain()}`;

  if (!normalizedDomain.endsWith(suffix)) {
    throw boom(400, "Only internal domains are supported", {
      code: "PROJECT_DOMAIN_ONLY_INTERNAL",
    });
  }

  const slug = normalizedDomain.slice(
    0,
    normalizedDomain.length - suffix.length,
  );

  if (INTERNAL_DOMAIN_SLUGS.has(slug)) {
    throw boom(400, "Internal slug not available", {
      code: "PROJECT_DOMAIN_INTERNAL_SLUG",
    });
  }

  if (await checkLabelHeldByAnotherProject({ label: slug, projectId })) {
    throw boom(400, "Domain already in use", {
      code: "PROJECT_DOMAIN_INTERNAL_SLUG",
    });
  }

  return normalizedDomain;
}

function getInternalDeploymentBaseDomain() {
  return config.get("deployments.baseDomain").toLowerCase();
}

function getInternalDeploymentDomain(slug: string) {
  return `${slug}.${getInternalDeploymentBaseDomain()}`;
}

function getInternalDeploymentDomainSlug(name: string, index = 0) {
  const nameSlug = slugify(name);
  return index
    ? `${nameSlug.slice(0, 48 - 1 - String(index).length)}-${index}`
    : nameSlug;
}

/**
 * Whether a label under the deployments base domain already answers for
 * another project. Branch aliases and deployment slugs are stored bare and
 * internal domains as full hostnames, while resolution treats both spellings
 * as the same hostname, so no unique constraint sees a clash between them.
 */
export async function checkLabelHeldByAnotherProject(input: {
  label: string;
  projectId: string;
}): Promise<boolean> {
  const { label, projectId } = input;
  const [alias, deployment, domain] = await Promise.all([
    DeploymentAlias.query()
      .select("deployment_aliases.id")
      .joinRelated("deployment")
      .where("deployment_aliases.alias", label)
      .whereNot("deployment.projectId", projectId)
      .first(),
    Deployment.query()
      .select("id")
      .where("slug", label)
      .whereNot("projectId", projectId)
      .first(),
    ProjectDomain.query()
      .select("id")
      .where("domain", getInternalDeploymentDomain(label))
      .whereNot("projectId", projectId)
      .first(),
  ]);
  return Boolean(alias || deployment || domain);
}

async function resolveInternalDeploymentDomain(input: {
  name: string;
  projectId: string;
  index: number;
}): Promise<string> {
  const slug = getInternalDeploymentDomainSlug(input.name, input.index);
  const domain = getInternalDeploymentDomain(slug);

  const isTaken =
    INTERNAL_DOMAIN_SLUGS.has(slug) ||
    (
      await Promise.all([
        ProjectDomain.query().select("id").findOne({ domain }),
        checkLabelHeldByAnotherProject({
          label: slug,
          projectId: input.projectId,
        }),
      ])
    ).some(Boolean);

  if (!isTaken) {
    return domain;
  }

  return resolveInternalDeploymentDomain({ ...input, index: input.index + 1 });
}

/**
 * Get the internal production domain configured for a project, if any.
 */
export async function getProductionInternalProjectDomain(
  projectId: string,
  trx?: TransactionOrKnex,
) {
  return (
    (await ProjectDomain.query(trx).findOne({
      projectId,
      environment: "production",
      internal: true,
    })) ?? null
  );
}

/**
 * Ensure a project has a unique internal production domain.
 * Creates one derived from the project name when none exists yet.
 */
export async function ensureProductionInternalProjectDomain(input: {
  projectId: string;
  projectName: string;
  index?: number;
}) {
  const existingDomain = await getProductionInternalProjectDomain(
    input.projectId,
  );

  if (existingDomain) {
    return existingDomain;
  }

  const domain = await resolveInternalDeploymentDomain({
    name: input.projectName,
    projectId: input.projectId,
    index: input.index ?? 0,
  });

  try {
    return await ProjectDomain.query().insertAndFetch({
      domain,
      environment: "production",
      branch: null,
      projectId: input.projectId,
      internal: true,
    });
  } catch (error) {
    if (!isUniqueViolationError(error)) {
      throw error;
    }

    const concurrentDomain = await getProductionInternalProjectDomain(
      input.projectId,
    );

    if (concurrentDomain) {
      return concurrentDomain;
    }

    return ensureProductionInternalProjectDomain({
      ...input,
      index: (input.index ?? 0) + 1,
    });
  }
}

/**
 * The deployment that holds the production aliases: they move to a production
 * deployment when it is ready.
 */
export async function getLatestReadyProductionDeployment(
  projectId: string,
  trx?: TransactionOrKnex,
) {
  return Deployment.query(trx)
    .where({
      projectId,
      environment: "production",
      status: "ready",
    })
    .orderBy([
      { column: "createdAt", order: "desc" },
      { column: "id", order: "desc" },
    ])
    .first();
}

/**
 * Deployments assign their aliases when finalized, so without this a domain
 * attached between two deployments serves nothing until the next one. False when
 * there is no ready production deployment to alias yet.
 */
export async function attachProductionDomainAlias(input: {
  projectId: string;
  domain: string;
  trx?: TransactionOrKnex;
}): Promise<boolean> {
  const deployment = await getLatestReadyProductionDeployment(
    input.projectId,
    input.trx,
  );

  if (!deployment) {
    return false;
  }

  await DeploymentAlias.query(input.trx)
    .insert({
      alias: input.domain,
      deploymentId: deployment.id,
      type: "domain",
    })
    .onConflict("alias")
    .merge({
      deploymentId: deployment.id,
      type: "domain",
      updatedAt: new Date().toISOString(),
    });

  return true;
}

/**
 * Removing the `project_domains` row is not enough: resolution reads
 * `deployment_aliases`, so an orphaned alias keeps answering.
 */
export async function detachDomainAlias(
  domain: string,
  trx?: TransactionOrKnex,
): Promise<void> {
  await DeploymentAlias.query(trx).delete().where({ alias: domain });
}

async function syncProductionDomainAlias(input: {
  projectId: string;
  previousDomain: string | null;
  nextDomain: string;
  trx?: TransactionOrKnex;
}) {
  const deployment = await getLatestReadyProductionDeployment(
    input.projectId,
    input.trx,
  );

  if (!deployment) {
    return { previousAlias: null, nextAlias: null };
  }

  const existingAlias = input.previousDomain
    ? await DeploymentAlias.query(input.trx).findOne({
        alias: input.previousDomain,
      })
    : null;

  if (existingAlias) {
    await existingAlias.$query(input.trx).patch({
      alias: input.nextDomain,
      deploymentId: deployment.id,
      type: "domain",
    });
    return {
      previousAlias: input.previousDomain,
      nextAlias: input.nextDomain,
    };
  }

  await attachProductionDomainAlias({
    projectId: input.projectId,
    domain: input.nextDomain,
    ...(input.trx ? { trx: input.trx } : {}),
  });

  return { previousAlias: null, nextAlias: input.nextDomain };
}

/**
 * Create or update the internal production domain for a project.
 * When a ready production deployment exists, its domain alias is kept in sync.
 */
export async function upsertProductionInternalProjectDomain(input: {
  projectId: string;
  domain: string;
}) {
  const normalizedDomain = await validateInternalDomain(
    input.domain,
    input.projectId,
  );

  return transaction(async (trx) => {
    const currentDomain = await getProductionInternalProjectDomain(
      input.projectId,
      trx,
    );
    const previousDomain = currentDomain?.domain ?? null;

    let projectDomain: ProjectDomain;
    if (currentDomain) {
      projectDomain = await currentDomain.$query(trx).patchAndFetch({
        domain: normalizedDomain,
      });
    } else {
      const insert: PartialModelRow<ProjectDomain> = {
        domain: normalizedDomain,
        environment: "production",
        branch: null,
        projectId: input.projectId,
        internal: true,
      };
      projectDomain = await ProjectDomain.query(trx).insertAndFetch(insert);
    }

    const aliases = await syncProductionDomainAlias({
      projectId: input.projectId,
      previousDomain,
      nextDomain: projectDomain.domain,
      trx,
    });

    return { projectDomain, ...aliases };
  });
}
