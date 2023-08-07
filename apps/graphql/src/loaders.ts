import DataLoader from "dataloader";
import type { ModelClass } from "objection";

import {
  Account,
  Build,
  BuildAggregatedStatus,
  File,
  GithubAccount,
  GithubRepository,
  Model,
  Plan,
  Project,
  Screenshot,
  ScreenshotBucket,
  ScreenshotDiff,
  Team,
  Test,
  User,
  VercelConfiguration,
  VercelProject,
} from "@argos-ci/database/models";

const createModelLoader = <TModelClass extends ModelClass<Model>>(
  Model: TModelClass,
) => {
  return new DataLoader<string, InstanceType<TModelClass>>(async (ids) => {
    const models = await Model.query().findByIds(ids as string[]);
    return ids.map((id) =>
      models.find((model: Model) => model.id === id),
    ) as InstanceType<TModelClass>[];
  });
};

const createBuildAggregatedStatusLoader = () =>
  new DataLoader<Build, BuildAggregatedStatus>(async (builds) =>
    Build.getAggregatedBuildStatuses(builds as Build[]),
  );

const createLatestProjectBuildLoader = () =>
  new DataLoader<string, Build | null>(async (projectIds) => {
    const latestBuilds = await Build.query()
      .select("*")
      .whereIn("projectId", projectIds as string[])
      .distinctOn("projectId")
      .orderBy("projectId")
      .orderBy("createdAt", "desc");
    const latestBuildsMap: Record<string, Build> = {};
    for (const build of latestBuilds) {
      latestBuildsMap[build.projectId!] = build;
    }
    return projectIds.map((id) => latestBuildsMap[id] ?? null);
  });

const createLastScreenshotDiffLoader = () =>
  new DataLoader<string, ScreenshotDiff | null>(async (testIds) => {
    const lastScreenshotDiffs = await ScreenshotDiff.query()
      .select("*")
      .whereIn("testId", testIds as string[])
      .distinctOn("testId")
      .orderBy("testId")
      .orderBy("createdAt", "desc");
    const lastScreenshotDiffMap: Record<string, ScreenshotDiff> = {};
    for (const lastScreenshotDiff of lastScreenshotDiffs) {
      lastScreenshotDiffMap[lastScreenshotDiff.testId!] = lastScreenshotDiff;
    }
    return testIds.map((id) => lastScreenshotDiffMap[id] ?? null);
  });

const createLastScreenshotLoader = () =>
  new DataLoader<string, Screenshot | null>(async (testIds) => {
    const project = await Project.query()
      .whereIn(
        "id",
        Test.query()
          .select("projectId")
          .where("id", testIds[0] as string),
      )
      .first();
    const referenceBranch = await project!.$getReferenceBranch();
    const lastScreenshots = await Screenshot.query()
      .select("screenshots.*", "screenshotBucket.branch")
      .whereIn("testId", testIds as string[])
      .distinctOn("testId")
      .joinRelated("screenshotBucket")
      .orderBy("testId")
      .orderByRaw(
        `CASE WHEN "screenshotBucket".branch = ? THEN 0 ELSE 1 END`,
        referenceBranch,
      )
      .orderBy("screenshots.createdAt", "desc");
    const lastScreenshotMap: Record<string, Screenshot> = {};
    for (const lastScreenshot of lastScreenshots) {
      lastScreenshotMap[lastScreenshot.testId!] = lastScreenshot;
    }
    return testIds.map((id) => lastScreenshotMap[id] ?? null);
  });

const createAccountFromRelationLoader = () => {
  return new DataLoader<{ userId?: string; teamId?: string }, Account | null>(
    async (relations) => {
      const userIds = relations
        .map((r) => r.userId)
        .filter((id) => id) as string[];
      const teamIds = relations
        .map((r) => r.teamId)
        .filter((id) => id) as string[];
      if (userIds.length === 0 && teamIds.length === 0) {
        return relations.map(() => null);
      }

      const query = Account.query();
      if (userIds.length > 0) {
        query.orWhereIn("userId", userIds);
      }
      if (teamIds.length > 0) {
        query.orWhereIn("teamId", teamIds);
      }
      const accounts = await query;
      return relations.map((relation) => {
        if (relation.userId) {
          return accounts.find((a) => a.userId === relation.userId) ?? null;
        }
        if (relation.teamId) {
          return accounts.find((a) => a.teamId === relation.teamId) ?? null;
        }
        return null;
      });
    },
  );
};

const createProjectFromVercelProjectLoader = () => {
  return new DataLoader<string, Project | null>(async (vercelProjectIds) => {
    const projects = await Project.query()
      .joinRelated("vercelProject")
      .whereIn("vercelProject.vercelId", vercelProjectIds as string[]);
    return vercelProjectIds.map(
      (id) => projects.find((p) => p.vercelProjectId === id) ?? null,
    );
  });
};

export const createLoaders = () => ({
  Account: createModelLoader(Account),
  AccountFromRelation: createAccountFromRelationLoader(),
  BuildAggregatedStatus: createBuildAggregatedStatusLoader(),
  File: createModelLoader(File),
  GithubAccount: createModelLoader(GithubAccount),
  GithubRepository: createModelLoader(GithubRepository),
  LatestProjectBuild: createLatestProjectBuildLoader(),
  LastScreenshot: createLastScreenshotLoader(),
  LastScreenshotDiff: createLastScreenshotDiffLoader(),
  Plan: createModelLoader(Plan),
  Project: createModelLoader(Project),
  ProjectFromVercelProject: createProjectFromVercelProjectLoader(),
  Screenshot: createModelLoader(Screenshot),
  ScreenshotBucket: createModelLoader(ScreenshotBucket),
  ScreenshotDiff: createModelLoader(ScreenshotDiff),
  Team: createModelLoader(Team),
  Test: createModelLoader(Test),
  User: createModelLoader(User),
  VercelConfiguration: createModelLoader(VercelConfiguration),
  VercelProject: createModelLoader(VercelProject),
});
