import { BuildNotification } from "@/database/models";

export async function isLatestBuildNotification(
  buildNotification: BuildNotification,
): Promise<boolean> {
  const latest = await BuildNotification.query()
    .select("id")
    .where("buildId", buildNotification.buildId)
    .orderBy("id", "desc")
    .first();
  return latest?.id === buildNotification.id;
}
