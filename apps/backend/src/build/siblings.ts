import { Build, Project, ScreenshotBucket } from "@/database/models";
import type { User } from "@/database/models";
import { queryBuilds } from "@/database/services/build";

/**
 * The other suites a commit produced: one build per name, latest run each, the
 * build's own suite excluded.
 *
 * A commit does not stop at a project boundary. A monorepo wired to several
 * Argos projects leaves one build per project on the same commit, and those are
 * exactly the builds the reviewer still has to go through — so the search spans
 * every project, not just this build's own.
 *
 * Access is re-derived per project rather than assumed from this build: another
 * project only contributes when the viewer is a *member* of it. Being public is
 * deliberately not enough — a commit SHA travels far enough that anyone could
 * otherwise hang a build of their own off someone else's commit and have it
 * offered as the next thing to review. This build's own project is always in
 * scope, since the viewer is already looking at it.
 */
export async function getSiblingBuilds(input: {
  build: Build;
  /** The build's compare bucket, which carries its branch and commit. */
  compareBucket: ScreenshotBucket;
  user: User | null;
}): Promise<Build[]> {
  const { build, compareBucket, user } = input;

  // Without a branch we cannot tell a sibling from any other build that
  // happens to share the commit.
  if (!compareBucket.branch) {
    return [];
  }
  const branch = compareBucket.branch;
  const commit = build.prHeadCommit ?? compareBucket.commit;

  const projectIds = await getReachableProjectIds({
    build,
    branch,
    commit,
    user,
  });

  // One build per name, per project: a suite that was re-run leaves older
  // builds behind on the same commit, and only its latest run is worth
  // reviewing. The name alone is not the key — two projects of the same
  // monorepo both call their suite `default`.
  const latestPerName = queryBuilds({
    projectId: projectIds,
    filters: { branch, commit },
  })
    .select("builds.id")
    .distinctOn(["builds.projectId", "builds.name"])
    .orderBy("builds.projectId")
    .orderBy("builds.name")
    .orderBy("builds.id", "desc");

  return (
    Build.query()
      .whereIn("builds.id", latestPerName)
      // Told apart by name, not by id: siblings are the commit's *other*
      // suites. Dropping this build's name rather than this build drops its
      // own earlier runs with it — a re-run of one suite is the same suite,
      // and offering it as somewhere else to go would list the same word twice
      // and put a switcher on every build of every re-run commit. Scoped to
      // its project: the same name in another project is another suite.
      .whereNot((qb) => {
        qb.where("builds.projectId", build.projectId).where(
          "builds.name",
          build.name,
        );
      })
      // This build's own project first — the reviewer is already there — then
      // a stable order across the others.
      .orderByRaw(`("builds"."projectId" = ?) desc`, [build.projectId])
      .orderBy("builds.projectId")
      .orderBy("builds.name")
  );
}

/**
 * The projects whose builds of this commit the viewer may see: this build's
 * own, plus every other project that built the commit and that the viewer is a
 * member of.
 */
async function getReachableProjectIds(input: {
  build: Build;
  branch: string;
  commit: string;
  user: User | null;
}): Promise<string[]> {
  const { build, branch, commit, user } = input;

  // An anonymous visitor is a member of nothing, so no other project can be
  // reached — skip the lookup entirely.
  if (!user) {
    return [build.projectId];
  }

  const candidateIds = await getProjectIdsWithCommit({ branch, commit });
  const otherIds = candidateIds.filter((id) => id !== build.projectId);
  if (otherIds.length === 0) {
    return [build.projectId];
  }

  const projects = await Project.query()
    .whereIn("id", otherIds)
    .withGraphFetched("account");
  const memberOf = await Promise.all(
    projects.map(async (project) => {
      const permissions = await Project.getMembershipPermissions(project, user);
      return permissions.includes("view") ? project.id : null;
    }),
  );

  return [build.projectId, ...memberOf.filter((id) => id !== null)];
}

/**
 * Every project that has a build on this commit, this build's own included.
 *
 * Both halves of the commit predicate are searched, since neither index covers
 * the other: the head commit of a pull request build sits on
 * `builds."prHeadCommit"`, while a build that is not from a pull request only
 * carries its commit on the compare bucket.
 */
async function getProjectIdsWithCommit(input: {
  branch: string;
  commit: string;
}): Promise<string[]> {
  const { branch, commit } = input;
  const [buckets, prBuilds] = await Promise.all([
    ScreenshotBucket.query()
      .distinct("projectId")
      .where("commit", commit)
      .where("branch", branch),
    Build.query().distinct("projectId").where("prHeadCommit", commit),
  ]);
  return [
    ...new Set([
      ...buckets.map((bucket) => bucket.projectId),
      ...prBuilds.map((prBuild) => prBuild.projectId),
    ]),
  ];
}
