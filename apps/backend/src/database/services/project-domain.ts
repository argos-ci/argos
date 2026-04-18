import { invariant } from "@argos/util/invariant";
import { slugify } from "@argos/util/slug";
import type { PartialModelObject } from "objection";

import config from "@/config";

import { Deployment, DeploymentAlias, ProjectDomain } from "../models";
import { transaction, type TransactionOrKnex } from "../transaction";

const DOMAIN_REGEX =
  /^(?=.{1,255}$)(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/;

function normalizeDomain(domain: string) {
  return domain.trim().toLowerCase();
}

export function validateDomain(domain: string) {
  const normalizedDomain = normalizeDomain(domain);

  if (!DOMAIN_REGEX.test(normalizedDomain)) {
    throw new Error("Invalid domain");
  }

  return normalizedDomain;
}

export function validateInternalDomain(domain: string) {
  const normalizedDomain = validateDomain(domain);
  const suffix = `.${getInternalDeploymentBaseDomain()}`;

  if (!normalizedDomain.endsWith(suffix)) {
    throw new Error("Only internal domains are supported");
  }

  return normalizedDomain;
}

export function getInternalDeploymentBaseDomain() {
  return config.get("deployments.baseDomain").toLowerCase();
}

export function getInternalDeploymentDomain(slug: string) {
  return `${slug}.${getInternalDeploymentBaseDomain()}`;
}

function getInternalDeploymentDomainSlug(name: string, index = 0) {
  const nameSlug = slugify(name);
  return index
    ? `${nameSlug.slice(0, 48 - 1 - String(index).length)}-${index}`
    : nameSlug;
}

async function resolveInternalDeploymentDomain(
  name: string,
  trx?: TransactionOrKnex,
  index = 0,
): Promise<string> {
  const domain = getInternalDeploymentDomain(
    getInternalDeploymentDomainSlug(name, index),
  );

  const existingDomain = await ProjectDomain.query(trx)
    .select("id")
    .findOne({ domain });

  if (!existingDomain) {
    return domain;
  }

  return resolveInternalDeploymentDomain(name, trx, index + 1);
}

export async function getProductionInternalProjectDomain(
  projectId: string,
  trx?: TransactionOrKnex,
) {
  return ProjectDomain.query(trx).findOne({
    projectId,
    environment: "production",
    internal: true,
  });
}

export async function ensureProductionInternalProjectDomain(input: {
  projectId: string;
  projectName: string;
  trx?: TransactionOrKnex;
}) {
  const existingDomain = await getProductionInternalProjectDomain(
    input.projectId,
    input.trx,
  );

  if (existingDomain) {
    return existingDomain;
  }

  const domain = await resolveInternalDeploymentDomain(
    input.projectName,
    input.trx,
  );

  return ProjectDomain.query(input.trx).insertAndFetch({
    domain,
    environment: "production",
    branch: null,
    projectId: input.projectId,
    internal: true,
  });
}

async function getLatestReadyProductionDeployment(
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
    });
    return {
      previousAlias: input.previousDomain,
      nextAlias: input.nextDomain,
    };
  }

  await DeploymentAlias.query(input.trx)
    .insert({
      alias: input.nextDomain,
      deploymentId: deployment.id,
    })
    .onConflict("alias")
    .merge({
      deploymentId: deployment.id,
      updatedAt: new Date().toISOString(),
    });

  return { previousAlias: null, nextAlias: input.nextDomain };
}

export async function upsertProductionInternalProjectDomain(input: {
  projectId: string;
  domain: string;
}) {
  const normalizedDomain = validateInternalDomain(input.domain);

  return transaction(async (trx) => {
    const currentDomain = await getProductionInternalProjectDomain(
      input.projectId,
      trx,
    );

    let projectDomain: ProjectDomain;
    if (currentDomain) {
      projectDomain = await currentDomain.$query(trx).patchAndFetch({
        domain: normalizedDomain,
      });
    } else {
      const insert: PartialModelObject<ProjectDomain> = {
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
      previousDomain: currentDomain?.domain ?? null,
      nextDomain: projectDomain.domain,
      trx,
    });

    return { projectDomain, ...aliases };
  });
}

export function getInternalDomainSlug(domain: string) {
  const baseDomain = getInternalDeploymentBaseDomain();
  const suffix = `.${baseDomain}`;
  const normalizedDomain = normalizeDomain(domain);

  invariant(
    normalizedDomain.endsWith(suffix),
    "Domain does not belong to the internal deployment base domain",
  );

  return normalizedDomain.slice(0, -suffix.length);
}
