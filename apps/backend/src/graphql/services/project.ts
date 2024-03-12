import { invariant } from "@argos/util/invariant";

import {
  Build,
  BuildNotification,
  Capture,
  Crawl,
  Project,
  Screenshot,
  ScreenshotBucket,
  ScreenshotDiff,
  Test,
  User,
} from "@/database/models/index.js";

export const getAdminProject = async (args: {
  id: string;
  user: User | undefined | null;
  withGraphFetched?: string;
}): Promise<Project> => {
  invariant(args.user, "no user");
  const query = Project.query().findById(args.id).throwIfNotFound();
  if (args.withGraphFetched) {
    query.withGraphFetched(args.withGraphFetched);
  }
  const project = await query;
  const permissions = await project.$getPermissions(args.user);
  invariant(permissions.includes("admin"), "not admin");
  return project;
};

export const deleteProject = async (args: {
  id: string;
  user: User | undefined | null;
}) => {
  const project = await getAdminProject({
    id: args.id,
    user: args.user,
  });
  await Capture.query()
    .joinRelated("crawl.build")
    .where("crawl:build.projectId", project.id)
    .delete();
  await Crawl.query()
    .joinRelated("build")
    .where("build.projectId", project.id)
    .delete();
  await ScreenshotDiff.query()
    .joinRelated("build")
    .where("build.projectId", project.id)
    .delete();
  await Screenshot.query()
    .joinRelated("screenshotBucket")
    .where("screenshotBucket.projectId", project.id)
    .delete();
  await BuildNotification.query()
    .joinRelated("build")
    .where("build.projectId", project.id)
    .delete();
  await Build.query().where("projectId", project.id).delete();
  await ScreenshotBucket.query().where("projectId", project.id).delete();
  await Test.query().where("projectId", project.id).delete();
  await project.$query().delete();
};
