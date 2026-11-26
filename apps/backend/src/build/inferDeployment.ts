import type { WithGraphModel } from "objection";
import type { z } from "zod";

import { raw } from "@/database";
import { Deployment, Screenshot } from "@/database/models";
import type { Build, Project } from "@/database/models";
import { getLatestReadyProductionDeployment } from "@/database/services/project-domain";
import { getEnvironmentFromBranch } from "@/deployment/environment";
import {
  createExternalDeployment,
  ExternalDeploymentUrlSchema,
} from "@/deployment/external";
import {
  checkIsDeploymentsHostname,
  getDeploymentAliasUrl,
} from "@/deployment/url";
import { redisLock } from "@/util/redis";

/**
 * Share of the screenshots with a URL that one origin must cover. A test that
 * leaves the app for a moment, through an OAuth provider or a payment page,
 * stays well under the rest. A suite split between two sites does not say
 * which one is the deployment.
 */
const MIN_ORIGIN_SHARE = 0.8;

/**
 * Top-level domains that never reach the public internet: special-use names
 * (RFC 6761, RFC 6762, RFC 8375, ICANN's `.internal`) and the private ones
 * routers and companies commonly use. The URL schema only refuses single-label
 * hosts and IP addresses.
 */
const NON_PUBLIC_TLDS = new Set([
  "arpa",
  "corp",
  "example",
  "home",
  "internal",
  "invalid",
  "lan",
  "local",
  "localhost",
  "test",
]);

/**
 * URLs without an origin, `file:` or `about:blank`, count under `null`.
 */
async function countScreenshotsByOrigin(
  screenshotBucketId: string,
): Promise<Map<string | null, number>> {
  const rows = await Screenshot.query()
    .where("screenshotBucketId", screenshotBucketId)
    .whereRaw(`coalesce("metadata"->>'url', '') <> ''`)
    // `scheme://authority`, split on `/` rather than matched with a regex,
    // which costs twice as much on a 50k screenshot bucket.
    .select(
      raw(
        `split_part("metadata"->>'url', '/', 1) || '//' || split_part("metadata"->>'url', '/', 3) as "authority"`,
      ),
      raw(`count(*)::int as "count"`),
    )
    .groupBy("authority")
    .castTo<{ authority: string; count: number }[]>();

  // Several authorities make one origin: `Example.com`, `example.com:443`,
  // `user@example.com`.
  const counts = new Map<string | null, number>();
  for (const { authority, count } of rows) {
    const url = URL.parse(authority);
    const origin = url && url.origin !== "null" ? url.origin : null;
    counts.set(origin, (counts.get(origin) ?? 0) + count);
  }
  return counts;
}

function pickMajorityOrigin(counts: Map<string | null, number>): string | null {
  let total = 0;
  let top: string | null = null;
  let topCount = 0;
  for (const [origin, count] of counts) {
    total += count;
    if (count > topCount) {
      top = origin;
      topCount = count;
    }
  }
  return topCount >= total * MIN_ORIGIN_SHARE ? top : null;
}

/**
 * The deployment URL an origin stands for, or `null` when it is not one
 * anyone else can open: a local dev server or Storybook, a private network.
 */
function parsePublicOrigin(
  origin: string,
): z.output<typeof ExternalDeploymentUrlSchema> | null {
  const result = ExternalDeploymentUrlSchema.safeParse(origin);
  if (!result.success) {
    return null;
  }
  const { hostname } = new URL(result.data);
  const tld = hostname.slice(hostname.lastIndexOf(".") + 1);
  if (NON_PUBLIC_TLDS.has(tld)) {
    return null;
  }
  // Argos knows the deployments it serves.
  if (checkIsDeploymentsHostname(hostname)) {
    return null;
  }
  return result.data;
}

/**
 * Whether production is served on the origin: the latest ready production
 * deployment's own URL, or one of its aliases, custom domains included.
 */
async function checkIsProductionOrigin(
  projectId: string,
  origin: string,
): Promise<boolean> {
  const deployment = await getLatestReadyProductionDeployment(projectId);
  if (!deployment) {
    return false;
  }
  const { aliases } = await deployment.$fetchGraph("aliases");
  return [deployment.url, ...aliases.map(getDeploymentAliasUrl)].some(
    (url) => new URL(url).origin === origin,
  );
}

/**
 * A reported deployment wins. One reported later is newer, and takes over.
 */
async function checkHasDeployment(input: {
  projectId: string;
  commitShas: string[];
}): Promise<boolean> {
  const deployment = await Deployment.query()
    .select("id")
    .where("projectId", input.projectId)
    .whereIn("commitSha", input.commitShas)
    .first();
  return deployment !== undefined;
}

/**
 * Record the deployment a build's tests ran against, read from the pages its
 * screenshots were taken on, when the team reported none for the commit.
 */
export async function inferDeployment(input: {
  build: Build;
  project: WithGraphModel<Project, "account">;
}): Promise<Deployment | null> {
  const { build, project } = input;
  const { authSource } = build;

  // A tokenless bearer only takes naming a pull request, a fork's included,
  // which must not put its URL in the upstream pull request comment. Builds
  // that predate `authSource` may be tokenless too.
  if (authSource === null || authSource === "github-actions-tokenless") {
    return null;
  }

  // A monitoring build screenshots a live site on a schedule, not a commit.
  if (build.mode !== "ci") {
    return null;
  }

  const {
    compareScreenshotBucket: { branch, commit },
  } = await build.$fetchGraph("compareScreenshotBucket");
  const commitShas = build.prHeadCommit
    ? [commit, build.prHeadCommit]
    : [commit];

  // Checked again under the lock. This one spares the screenshot scan to the
  // builds of teams that report their deployments.
  if (await checkHasDeployment({ projectId: project.id, commitShas })) {
    return null;
  }

  const origin = pickMajorityOrigin(
    await countScreenshotsByOrigin(build.compareScreenshotBucketId),
  );
  const url = origin ? parsePublicOrigin(origin) : null;
  if (!origin || !url) {
    return null;
  }

  const environment = await getEnvironmentFromBranch({ project, branch });

  // Smoke tests of a pull request against the production site.
  if (
    environment === "preview" &&
    (await checkIsProductionOrigin(project.id, origin))
  ) {
    return null;
  }

  return redisLock.acquire(
    ["infer-deployment", project.id, commit],
    async () => {
      if (await checkHasDeployment({ projectId: project.id, commitShas })) {
        return null;
      }

      return createExternalDeployment({
        project,
        url,
        environment,
        branch,
        commitSha: commit,
        prHeadCommit: build.prHeadCommit,
        githubPullRequestId: build.githubPullRequestId,
        authSource,
      });
    },
  );
}
