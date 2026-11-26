import type { WithGraphModel } from "objection";

import config from "@/config";
import { raw } from "@/database";
import { Deployment, Screenshot } from "@/database/models";
import type { Build, Project } from "@/database/models";
import { getEnvironmentFromBranch } from "@/deployment/environment";
import {
  createExternalDeployment,
  ExternalDeploymentUrlSchema,
} from "@/deployment/external";
import { getDeploymentAliasUrl } from "@/deployment/url";
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
 * Count the screenshots of a bucket by the origin of the page they were taken
 * on. URLs without an origin, `file:` or `about:blank`, count under `null`.
 */
async function countScreenshotsByOrigin(
  screenshotBucketId: string,
): Promise<Map<string | null, number>> {
  const rows = await Screenshot.query()
    .where("screenshotBucketId", screenshotBucketId)
    .whereRaw(`coalesce("metadata"->>'url', '') <> ''`)
    .select(
      raw(`substring("metadata"->>'url' from ?) as "authority"`, [
        "^[A-Za-z][A-Za-z0-9+.-]*://[^/?#]*",
      ]),
      raw(`count(*)::int as "count"`),
    )
    .groupBy("authority")
    .castTo<{ authority: string | null; count: number }[]>();

  // Several authorities make one origin: `Example.com`, `example.com:443`,
  // `user@example.com`.
  const counts = new Map<string | null, number>();
  for (const { authority, count } of rows) {
    const url = authority ? URL.parse(authority) : null;
    const origin = url && url.origin !== "null" ? url.origin : null;
    counts.set(origin, (counts.get(origin) ?? 0) + count);
  }
  return counts;
}

function pickMajorityOrigin(counts: Map<string | null, number>): string | null {
  let total = 0;
  let top: { origin: string | null; count: number } | null = null;
  for (const [origin, count] of counts) {
    total += count;
    if (!top || count > top.count) {
      top = { origin, count };
    }
  }
  if (!top || top.count < total * MIN_ORIGIN_SHARE) {
    return null;
  }
  return top.origin;
}

/**
 * The deployment URL an origin stands for, or `null` when it is not one
 * anyone else can open: a local dev server or Storybook, a private network.
 */
function parsePublicOrigin(origin: string): string | null {
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
  const baseDomain = config.get("deployments.baseDomain").toLowerCase();
  if (hostname === baseDomain || hostname.endsWith(`.${baseDomain}`)) {
    return null;
  }
  return result.data;
}

/**
 * The origins production is served on: the latest ready production
 * deployment's own URL and its aliases, custom domains included. Aliases move
 * to a deployment when it is ready.
 */
async function getProductionOrigins(projectId: string): Promise<Set<string>> {
  const deployment = await Deployment.query()
    .where({ projectId, environment: "production", status: "ready" })
    .withGraphFetched("aliases")
    .orderBy([
      { column: "createdAt", order: "desc" },
      { column: "id", order: "desc" },
    ])
    .first();
  if (!deployment) {
    return new Set();
  }
  return new Set(
    [deployment.url, ...deployment.aliases.map(getDeploymentAliasUrl)].map(
      (url) => new URL(url).origin,
    ),
  );
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

  const { compareScreenshotBucket: bucket } = await build.$fetchGraph(
    "compareScreenshotBucket",
    { skipFetched: true },
  );

  const origin = pickMajorityOrigin(await countScreenshotsByOrigin(bucket.id));
  const url = origin ? parsePublicOrigin(origin) : null;
  if (!origin || !url) {
    return null;
  }

  const { branch, commit } = bucket;
  const environment = await getEnvironmentFromBranch({ project, branch });

  // Smoke tests of a pull request against the production site.
  if (
    environment === "preview" &&
    (await getProductionOrigins(project.id)).has(origin)
  ) {
    return null;
  }

  const commitShas = build.prHeadCommit
    ? [commit, build.prHeadCommit]
    : [commit];

  return redisLock.acquire(
    ["infer-deployment", project.id, commit],
    async () => {
      // A reported deployment wins. One reported later is newer, and takes over.
      const reported = await Deployment.query()
        .select("id")
        .where("projectId", project.id)
        .whereIn("commitSha", commitShas)
        .first();
      if (reported) {
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
